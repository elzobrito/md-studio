# ADR-diagram-engines — Diagram Engines adicionais: Graphviz, WaveDrom e D2

**Status:** Aceita  
**Data:** 2026-09-27  
**Decisores:** agent-spec (MD-V05-052-SPIKE)  
**Spec normativa:** `052-diagram-engines-adicionais.md`  
**Contexto ESAA:** MD-V05-052-SPIKE

---

## 1. Contexto

O MD Studio v0.5 expande a capacidade de diagramação além de Mermaid. O roadmap
indica três engines candidatas: **Graphviz/DOT**, **WaveDrom** e **D2** (condicionada
a spike). Todas devem operar 100% offline, local-first, sem download dinâmico de
engines em runtime. O Mermaid renderer existente (`renderMermaid()`) permanece
canônico e inalterado.

O `main` atual não possui `DiagramEngineRegistry`, dependências Graphviz/WaveDrom/D2,
nem dispatch por engine no `MarkdownViewer`. A spec exige um registry local de engines
por fenced language com adapters isolados, lazy-loaded e com budget de tamanho.

---

## 2. Critérios de avaliação

| Critério                  | Peso | Descrição                                                |
|---------------------------|------|----------------------------------------------------------|
| Licença                   | Alto | Compatível com MIT/Apache-2.0, sem GPL viral             |
| Bundle size               | Alto | Budget ≤ 3 MB por engine (WASM + JS wrapper)             |
| API offline               | Alto | Zero rede em runtime; WASM/JS puro, bundleable           |
| Output                    | Médio| SVG limpo, sanitizável, compatível com export existente  |
| Maturidade                | Médio| Mantida ativamente, comunidade, npm downloads            |
| Segurança                 | Alto | Sem execução de código arbitrário, SVG sanitizável       |
| Lazy-load                 | Médio| Dynamic import possível; não impacta bundle principal    |

---

## 3. Graphviz/DOT — Decisão: **APROVADO**

### Candidato selecionado: `@hpcc-js/wasm-graphviz`

| Atributo       | Valor                                                         |
|----------------|---------------------------------------------------------------|
| Pacote         | `@hpcc-js/wasm-graphviz` (parte do monorepo `@hpcc-js/wasm`) |
| Versão         | 2.35.x (ativa em Set/2026)                                   |
| Licença        | Apache-2.0                                                    |
| Bundle         | ~2.5 MB (WASM binário); JS wrapper ~15 KB                    |
| API            | `Graphviz.load()` → `graphviz.dot(source)` → SVG string      |
| Offline        | ✅ WASM local, sem rede                                       |
| Output         | SVG completo (dot, neato, twopi, fdp, circo, sfdp)            |
| Lazy-load      | ✅ Dynamic `import()` + WASM como asset estático               |
| Segurança      | SVG produzido sanitizável pelo pipeline existente             |
| Manutenção     | Ativa (Gordon Smith / hpcc-systems)                           |

### Integração recomendada

```typescript
// Adapter registrado no DiagramEngineRegistry
{
  id: "graphviz",
  languages: ["dot", "graphviz"],
  render: async (source) => {
    const { Graphviz } = await import("@hpcc-js/wasm-graphviz");
    const gv = await Graphviz.load();
    return { svg: gv.dot(source) };
  },
  available: true
}
```

### Configuração de build

O `.wasm` deve ser copiado como asset estático pelo Vite (`vite-plugin-static-copy`
ou configuração `assetsInclude`). Proibido servir via CDN.

---

## 4. WaveDrom — Decisão: **APROVADO**

### Candidato selecionado: `wavedrom`

| Atributo       | Valor                                                      |
|----------------|--------------------------------------------------------------|
| Pacote         | `wavedrom`                                                   |
| Versão         | 3.x (estável)                                                |
| Licença        | MIT                                                          |
| Bundle         | ~120 KB minificado (JS puro, sem WASM)                       |
| API            | `wavedrom.renderAny(0, parseWaveDromJSON(source), container)` |
| Offline        | ✅ JS puro, zero dependências de rede                         |
| Output         | SVG inline no DOM; extraível como string                     |
| Lazy-load      | ✅ Dynamic `import()` trivial                                 |
| Segurança      | Entrada JSON parseable; SVG sanitizável                      |
| Manutenção     | Mantido (Aliaksei Chapyzhenka / wavedrom org)                |

### Integração recomendada

```typescript
{
  id: "wavedrom",
  languages: ["wavedrom"],
  render: async (source) => {
    const wavedrom = await import("wavedrom");
    // WaveDrom espera JSON
    const parsed = JSON.parse(source);
    // Render em container virtual
    const container = document.createElement("div");
    wavedrom.default.renderAny(0, parsed, container);
    const svg = container.querySelector("svg")?.outerHTML ?? "";
    return { svg };
  },
  available: true
}
```

### Nota sobre input

WaveDrom usa WaveJSON (formato JSON), não uma DSL textual. O fenced block
deve conter JSON válido. Erros de parse devem acionar fallback editorial
(source preservado + diagnóstico).

---

## 5. D2 — Decisão: **ADIADO** (deferred)

### Candidato avaliado: `@terrastruct/d2`

| Atributo       | Valor                                                      |
|----------------|--------------------------------------------------------------|
| Pacote         | `@terrastruct/d2`                                            |
| Versão         | 0.x (pré-1.0)                                                |
| Licença        | MPL-2.0 (copyleft fraco — requer avaliação jurídica)         |
| Bundle         | **~15-25 MB** (WASM com compiler + layout engines)           |
| API            | Compilador Go→WASM; inclui TALA, Dagre, ELK                 |
| Offline        | ✅ WASM local                                                 |
| Segurança      | WASM sandboxed; SVG sanitizável                              |
| Manutenção     | Ativa (Terrastruct)                                          |

### Motivos do adiamento

1. **Bundle size excede o budget**: 15-25 MB de WASM viola o budget de ≤ 3 MB
   por engine estabelecido pela spec 052. Mesmo com compressão Brotli (~4-6 MB
   transferência), o decode/compile em runtime é pesado.

2. **Licença MPL-2.0**: Copyleft fraco que exige análise jurídica para
   compatibilidade com a licença do MD Studio. Não é bloqueante per se,
   mas requer decisão formal que não pertence ao escopo deste spike.

3. **Versão pré-1.0**: API não estabilizada. Risco de breaking changes
   frequentes incompatíveis com garantias de publicação do MD Studio.

4. **Impacto no startup**: Mesmo com lazy-load, 15+ MB de WASM impacta
   significativamente cold-start e uso de memória em máquinas modestas.

### Condições para reavaliação

D2 pode ser reavaliado em v0.6+ se:
- Bundle WASM reduzir para ≤ 5 MB;
- Licença for resolvida (ou projeto migrar para MIT/Apache-2.0);
- API estabilizar em 1.0;
- MD Studio adotar carregamento de engines sob demanda explícita do usuário
  (diferente de lazy-load automático).

Enquanto adiado, blocos ````d2` devem receber status `unavailable/deferred`
no registry, renderizando como code block com syntax highlight (Shiki)
e label informativo.

---

## 6. DiagramEngineRegistry — Contrato mínimo

```typescript
interface DiagramEngine {
  /** Unique engine identifier */
  id: string;
  /** Fenced code block languages this engine handles */
  languages: string[];
  /** Render source to SVG */
  render(source: string, options?: DiagramRenderOptions): Promise<DiagramRenderResult>;
  /** Whether this engine is available (installed, loaded, not deferred) */
  available: boolean;
  /** Human-readable label */
  label: string;
}

interface DiagramRenderOptions {
  isDark?: boolean;
  theme?: string;
}

interface DiagramRenderResult {
  svg?: string;
  error?: string;
}

class DiagramEngineRegistry {
  register(engine: DiagramEngine): void;
  findByLanguage(language: string): DiagramEngine | null;
  getEngines(): DiagramEngine[];
}
```

Mermaid pode ser migrado para este registry como adapter sem substituir
`renderMermaid()`. A migração é opcional e pode ocorrer na task
MD-V05-052 (implementação) se aprovada.

---

## 7. Decisão resumida

| Engine     | Pacote                     | Decisão   | Bundle   | Licença     |
|------------|----------------------------|-----------|----------|-------------|
| Graphviz   | `@hpcc-js/wasm-graphviz`   | Aprovado  | ~2.5 MB  | Apache-2.0  |
| WaveDrom   | `wavedrom`                 | Aprovado  | ~120 KB  | MIT         |
| D2         | `@terrastruct/d2`          | Adiado    | ~15-25 MB| MPL-2.0     |

---

## 8. Consequências

- **Positivas**: MD Studio passa a suportar Graphviz/DOT e WaveDrom como
  linguagens de diagrama no fenced code block, ampliando significativamente
  a cobertura de diagramação técnica (grafos, state machines, timing diagrams).
  Ambas as engines são leves, maduras e 100% offline.

- **Negativas**: D2 não entra na v0.5, o que limita a oferta a usuários
  que preferem a sintaxe D2. O budget de WASM é restritivo, mas necessário
  para manter performance aceitável em todas as plataformas.

- **Mitigação**: Blocos ````d2` são preservados como code blocks com
  syntax highlight, sem perda de conteúdo. Reavaliação formal programada
  para v0.6.

---

## 9. Referências

- Spec 052: `052-diagram-engines-adicionais.md`
- `@hpcc-js/wasm-graphviz`: https://github.com/hpcc-systems/hpcc-js-wasm
- WaveDrom: https://github.com/wavedrom/wavedrom
- D2: https://d2lang.com / https://www.npmjs.com/package/@terrastruct/d2
- Mermaid renderer existente: `src/markdown/mermaid.ts`
- Diagram export existente: `src/services/diagramExport.ts`
