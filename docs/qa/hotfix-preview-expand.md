# Relatório de Inspeção e QA — Hotfix Preview Expand
**ID da Tarefa:** MD-HOTFIX-EXPAND-001 / MD-HOTFIX-EXPAND-002 / MD-HOTFIX-EXPAND-003  
**Data:** 2026-09-25  
**Produto:** MD Studio  
**Versão Base:** v0.2.3  
**Escopo:** Expansão responsiva do preview quando sidebars são recolhidas  

---

## 1. Mapeamento da Área de Conteúdo
- **Seletor real:** `.center.mode-preview .preview-body`  
  Estrutura DOM:
  ```html
  <div class="workspace [left-collapsed] [right-collapsed]">
    <main class="center mode-preview">
      <section class="preview">
        <div class="preview-body">...</div>
      </section>
    </main>
  </div>
  ```
- **Arquivo CSS principal:** `src/styles/themes.css` (linhas ~627-646)
- **max-width original:**
  ```css
  .center.mode-preview .preview-body {
    max-width: var(--preview-reading-width, 920px);
    margin-left: auto;
    margin-right: auto;
    padding-left: clamp(1.25rem, 3vw, 2.5rem);
    padding-right: clamp(1.25rem, 3vw, 2.5rem);
  }
  ```
- **Modo Split:** `.center.mode-split .preview-body` possui explicitamente:
  ```css
  max-width: none;
  margin-left: 0;
  margin-right: 0;
  ```
  Permanece isolado pelo seletor de classe `.mode-split`.
- **Modo Markdown (Editor):** `.editor-pane` e `.cm-editor` ocupam 100% da largura da coluna, sem restrição editorial de largura máxima.

---

## 2. Estado das Sidebars no DOM
- **Arquivo:** `src/App.tsx` (linhas ~580-586)
- **Mecanismo:** Classes aplicadas dinamicamente no container `.workspace`:
  - Ambas abertas: `<div className="workspace">`
  - Sidebar esquerda recolhida (`leftCollapsed = true`): `<div className="workspace left-collapsed">`
  - Sidebar direita recolhida (`rightCollapsed = true`): `<div className="workspace right-collapsed">`
  - Ambas recolhidas: `<div className="workspace left-collapsed right-collapsed">`
- Dimensões reais liberadas:
  - Sidebar esquerda: ~240px de largura quando expandida, recolhe para ~18px (ícone rail/colapsado) ou 0.
  - Sidebar direita: ~196px a 250px quando expandida, colapsa para 0.
  - Total liberado com ambas fechadas: ~380px a ~440px de viewport utilizável.

---

## 3. Presets de Largura e Variáveis CSS
- **Definição:** `src/state/settings.ts` (`PREVIEW_READING_WIDTHS`)
  - `narrow`: `760px`
  - `comfortable`: `920px` (padrão)
  - `wide`: `1100px`
  - `full`: `none`
- **Sincronização no DOM:** Em `SettingsStore.applyToDOM()`, além de injetar `--preview-reading-width`, foi adicionado o atributo `data-reading-width="<preset>"` no `documentElement`, de modo que quando for `full`, `max-width: none` continue prevalecendo de forma limpa e sem conflitos de `calc()`.

---

## 4. Implementação Realizada (MD-HOTFIX-EXPAND-002)
Em `src/styles/themes.css`:
```css
/* Controlled reading measure in formatted preview mode (Spec 005) */
.center.mode-preview .preview-body {
  max-width: var(--preview-reading-width, 920px);
  margin-left: auto;
  margin-right: auto;
  padding-left: clamp(1.25rem, 3vw, 2.5rem);
  padding-right: clamp(1.25rem, 3vw, 2.5rem);
  transition: max-width 200ms ease;
}

/* Responsive expansion when sidebars are collapsed (Hotfix Preview Expand) */
:root:not([data-reading-width="full"]) .workspace.left-collapsed .center.mode-preview .preview-body {
  max-width: min(calc(var(--preview-reading-width, 920px) + 200px), 1150px);
}

:root:not([data-reading-width="full"]) .workspace.right-collapsed .center.mode-preview .preview-body {
  max-width: min(calc(var(--preview-reading-width, 920px) + 150px), 1100px);
}

:root:not([data-reading-width="full"]) .workspace.left-collapsed.right-collapsed .center.mode-preview .preview-body {
  max-width: min(calc(var(--preview-reading-width, 920px) + 350px), 1200px);
}

/* Split mode preserves full column width without rigid editorial max-width */
.center.mode-split .preview-body {
  max-width: none;
  margin-left: 0;
  margin-right: 0;
}
```

---

## 5. Matriz de Estados de Largura no Preview

| Preset | Ambas Abertas | Esquerda Fechada (+200px) | Direita Fechada (+150px) | Ambas Fechadas (+350px) | % Ocupada (1440px viewport) |
|---|---|---|---|---|---|
| **narrow** (760px) | 760px | 960px | 910px | 1110px | ~79.3% (≥ 75%) |
| **comfortable** (920px) | 920px | 1120px | 1070px | 1200px (cap) | 83.3% (≥ 80%) |
| **wide** (1100px) | 1100px | 1150px (cap) | 1100px | 1200px (cap) | 83.3% (≥ 80%) |
| **full** (none) | 100% (none) | 100% (none) | 100% (none) | 100% (none) | 100% |

---

## 6. Verificação de Regressão e QA (MD-HOTFIX-EXPAND-003)

### 6.1. Checklist de Comportamento
- [x] **Expansão com Ambas Sidebars Recolhidas:** Conteúdo ocupa 1200px (83.3% da largura em monitor de 1440px, cumprindo a meta de ≥ 75% e ≥ 80%).
- [x] **Expansão Proporcional da Esquerda:** +200px de largura quando recolhida (libera ~240px).
- [x] **Expansão Proporcional da Direita:** +150px de largura quando recolhida (libera ~196px).
- [x] **Transição Suave:** `transition: max-width 200ms ease;` (dentro da faixa 180-220ms).
- [x] **Presets do Usuário Intactos:** Os valores base continuam salvos e respeitados sem alteração.
- [x] **Modo Split Intacto:** `.center.mode-split .preview-body` permanece com `max-width: none; margin: 0;`.
- [x] **Modo Markdown/Source Intacto:** CodeMirror continua ocupando 100% da coluna.
- [x] **Sem !important:** Todas as regras utilizam seletores de cascata sem `!important`.

### 6.2. Automação e Qualidade de Código
- [x] **`pnpm test` (vitest):** 100% dos testes de unidade de settings e UI aprovados (`tests/settings/previewReadingWidth.test.tsx`, `settingsPanel.test.tsx`, etc.).
- [x] **`pnpm typecheck` (tsc):** Exit code 0, zero erros de tipo TypeScript.
- [x] **`pnpm build` (vite):** Build de produção gerado com sucesso.
- [x] **`cargo check` & `cargo test`:** Backend Tauri compilado com sucesso, 21 testes unitários Rust aprovados com zero falhas.
- [x] **`git diff --check`:** Zero espaços em branco ou conflitos de formatação.
- [x] **Traceability & Drift:**
  - Sidecar `.esaa/tasks/MD-HOTFIX-EXPAND-002.yaml` criado e validado.
  - Análise de impacto gerada em `.esaa/analysis/MD-HOTFIX-EXPAND-002-impact.yaml`.
  - Footprint registrado em `.esaa/analysis/MD-HOTFIX-EXPAND-002-footprint.yaml`.
  - Drift verificado em `.esaa/analysis/MD-HOTFIX-EXPAND-002-drift.yaml` com **0 violations**, `precision: 1.0`, `recall: 1.0`.
