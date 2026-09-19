ONDA 0B — Guided Markdown | MD-GM-005
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-005)
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
# WBS-GM-005

# Markdown Cheatsheet

Módulo origem: Módulo 5
Prioridade: MÉDIA
Sprint: GM-A
Depende de: nenhuma

---

## WBS-GM-005.01

Subtarefa: Definir catálogo de referências

Artefato:

```
src/components/help/cheatsheet-items.ts   [CRIAR]
```

```typescript
export interface CheatsheetItem {
  category: string;
  syntax: string;
  result: string;       // texto descritivo do resultado
  copyText: string;     // o que é copiado ao clicar
}

export const CHEATSHEET_ITEMS: CheatsheetItem[] = [
  { category: 'Headings', syntax: '# Título 1', result: 'H1 — Título principal', copyText: '# ' },
  { category: 'Headings', syntax: '## Título 2', result: 'H2 — Subtítulo', copyText: '## ' },
  { category: 'Headings', syntax: '### Título 3', result: 'H3 — Seção', copyText: '### ' },
  { category: 'Formatação', syntax: '**negrito**', result: 'negrito', copyText: '**texto**' },
  { category: 'Formatação', syntax: '_itálico_', result: 'itálico', copyText: '_texto_' },
  { category: 'Formatação', syntax: '~~tachado~~', result: '~~tachado~~', copyText: '~~texto~~' },
  { category: 'Formatação', syntax: '`código`', result: 'código inline', copyText: '`código`' },
  { category: 'Listas', syntax: '- item', result: '• item', copyText: '- ' },
  { category: 'Listas', syntax: '1. item', result: '1. item', copyText: '1. ' },
  { category: 'Listas', syntax: '- [ ] tarefa', result: '☐ tarefa', copyText: '- [ ] ' },
  { category: 'Listas', syntax: '- [x] feita', result: '☑ feita', copyText: '- [x] ' },
  { category: 'Links', syntax: '[texto](url)', result: 'texto (link)', copyText: '[texto](url)' },
  { category: 'Links', syntax: '![alt](img.png)', result: '[imagem]', copyText: '![alt](url)' },
  { category: 'Blocos', syntax: '> citação', result: '│ citação', copyText: '> ' },
  { category: 'Blocos', syntax: '---', result: '─────────', copyText: '---' },
  { category: 'Blocos', syntax: '```\\ncódigo\\n```', result: 'bloco de código', copyText: '```\n\n```' },
  { category: 'Alertas', syntax: '> [!NOTE]\\n> texto', result: '📌 Nota', copyText: '> [!NOTE]\n> ' },
  { category: 'Alertas', syntax: '> [!TIP]\\n> texto', result: '💡 Dica', copyText: '> [!TIP]\n> ' },
  { category: 'Alertas', syntax: '> [!WARNING]\\n> texto', result: '⚠ Aviso', copyText: '> [!WARNING]\n> ' },
  { category: 'Tabelas', syntax: '| Col | Col |\\n| --- | --- |\\n| val | val |', result: 'Tabela', copyText: '| Coluna 1 | Coluna 2 |\n| -------- | -------- |\n| valor    | valor    |\n' },
];
```

---

## WBS-GM-005.02

Subtarefa: Implementar CheatsheetRow

Artefato:

```
src/components/help/CheatsheetRow.tsx   [CRIAR]
```

Layout:

```
┌──────────────────────┬──────────────────────┬──────────┐
│  **negrito**         │  negrito             │ [Copiar] │
└──────────────────────┴──────────────────────┴──────────┘
```

---

## WBS-GM-005.03

Subtarefa: Implementar MarkdownCheatsheet

Artefato:

```
src/components/help/MarkdownCheatsheet.tsx   [CRIAR]
src/styles/cheatsheet.css                    [CRIAR]
```

Layout geral:

```
┌────────────────────────────────────────────────────────────────┐
│  📖 Referência Markdown                                 [✕]   │
├─────────────────────────────────────────────────────────────── ┤
│  Headings                                                       │
│  # Título 1         H1 — Título principal        [Copiar]      │
│  ## Título 2        H2 — Subtítulo               [Copiar]      │
│  ### Título 3       H3 — Seção                   [Copiar]      │
├────────────────────────────────────────────────────────────────┤
│  Formatação                                                     │
│  **negrito**        negrito                      [Copiar]      │
│  _itálico_          itálico                      [Copiar]      │
│  ~~tachado~~        ~~tachado~~                  [Copiar]      │
│  `código`           código inline                [Copiar]      │
├────────────────────────────────────────────────────────────────┤
│  Listas / Alertas / Links / Tabelas / Blocos                   │
└────────────────────────────────────────────────────────────────┘
```

Agrupamento por categoria com cabeçalho separador.

---

## WBS-GM-005.04

Subtarefa: Registrar atalho e botão de abertura

```
Ctrl+Shift+H → abre cheatsheet
Botão [?] na toolbar → abre cheatsheet
```

Artefatos:

```
src/hooks/useKeyboardShortcuts.ts            [MODIFICAR]
src/components/editor/FormattingToolbar.tsx  [MODIFICAR]
```

---

## Critérios de Aceitação — WBS-GM-005

```
[ ] Ctrl+Shift+H abre o painel
[ ] Botão [?] na toolbar abre o painel
[ ] Todas as categorias exibidas
[ ] Todos os 20 itens listados
[ ] Botão Copiar copia a sintaxe para clipboard
[ ] Feedback visual de "Copiado!" ao clicar
[ ] ESC fecha o painel
[ ] [✕] fecha o painel
[ ] Não bloqueia o editor (modal não-modal ou sidebar)
```

Verify: `markdown_cheatsheet_pass`

---