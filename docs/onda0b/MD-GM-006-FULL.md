ONDA 0B — Guided Markdown | MD-GM-006
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-006)
Executor: outro agente. Cadastrado no ESAA para execução externa.

PATHS REAIS DO REPO (remap obrigatório vs WBS):
- Editor: src/components/MarkdownEditor.tsx
- Preferir criar sob: src/components/editor/, src/editor/formatting|slash|paste|hints|table/, src/styles/
- App modos: source | preview | split — toolbar/hints só em source e split
- Não quebrar Onda 0 (vitest 40), MD-FOUNDATION-*, MDS-PROD-OPEN-FILE-001, watcher, export HTML

PRINCÍPIOS: GM-P1 não esconder MD; GM-P2 progressivo; GM-P3 contextual; GM-P4 não destrutivo; GM-P5 compatível CM6.
FORA DE ESCOPO: WYSIWYG, docx/odt, cloud, collab, criar/apagar arquivo via toolbar.

---
CONTEÚDO WBS COMPLETO:
# WBS-GM-006

# Markdown Hints

Módulo origem: Módulo 6
Prioridade: MÉDIA
Sprint: GM-A
Depende de: nenhuma

---

## WBS-GM-006.01

Subtarefa: Definir mapeamento de hints

Artefato:

```
src/editor/hints/hint-definitions.ts   [CRIAR]
```

```typescript
export interface HintDefinition {
  pattern: RegExp;
  message: (match: RegExpMatchArray) => string;
}

export const HINT_DEFINITIONS: HintDefinition[] = [
  {
    pattern: /^\*\*(.+?)\*\*/,
    message: () => 'Negrito — Ctrl+B'
  },
  {
    pattern: /^_(.+?)_/,
    message: () => 'Itálico — Ctrl+I'
  },
  {
    pattern: /^#{1,6}\s/,
    message: (m) => `Cabeçalho nível ${m[0].trim().length}`
  },
  {
    pattern: /^\[\[(.+?)\]\]/,
    message: (m) => `Wiki Link → ${m[1]}`
  },
  {
    pattern: /^https?:\/\/\S+/,
    message: () => 'Link externo — Ctrl+Click para abrir'
  },
  {
    pattern: /^`(.+?)`/,
    message: () => 'Código inline — Ctrl+E'
  },
  {
    pattern: /^> \[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]/,
    message: (m) => `Alerta GitHub: ${m[1]}`
  },
];
```

---

## WBS-GM-006.02

Subtarefa: Implementar hint-plugin

Artefato:

```
src/editor/hints/hint-plugin.ts   [CRIAR]
```

Comportamento:

```typescript
// Ao detectar hover sobre token Markdown
// Identificar o tipo de elemento
// Exibir tooltip posicionado acima do cursor
// Esconder ao mover cursor
// Delay: 600ms antes de exibir (evitar ruído)
```

---

## WBS-GM-006.03

Subtarefa: Estilização dos tooltips

Artefato:

```
src/styles/hints.css   [CRIAR]
```

```css
.md-hint-tooltip {
  position: fixed;
  z-index: 900;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
}

.md-hint-tooltip.visible {
  opacity: 1;
}
```

---

## WBS-GM-006.04

Subtarefa: Toggle nas configurações

```
Settings → Editor → Hints de sintaxe: [✓] Ativo
```

Artefato:

```
src/state/settings.ts   [MODIFICAR]
```

---

## Critérios de Aceitação — WBS-GM-006

```
[ ] Tooltip aparece ao pausar cursor sobre elemento Markdown
[ ] Delay de ~600ms antes de exibir (sem ruído)
[ ] **texto** → "Negrito — Ctrl+B"
[ ] _texto_ → "Itálico — Ctrl+I"
[ ] # → "Cabeçalho nível N"
[ ] [[link]] → "Wiki Link → nome"
[ ] https://... → "Link externo"
[ ] > [!NOTE] → "Alerta GitHub: NOTE"
[ ] Tooltip desaparece ao mover cursor
[ ] Não interfere na digitação
[ ] Toggle nas configurações funciona
```

Verify: `markdown_hints_pass`

---