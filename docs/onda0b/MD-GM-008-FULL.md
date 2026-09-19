ONDA 0B — Guided Markdown | MD-GM-008
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-008)
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
# WBS-GM-008

# QA Guided Markdown

Módulo origem: Módulo 8
Prioridade: CRÍTICA
Sprint: GM-D
Depende de: todos os módulos anteriores

---

## WBS-GM-008.01

Subtarefa: Suíte Formatting Toolbar

Artefato:

```
tests/editor/formatting-toolbar.test.ts   [CRIAR]
```

Casos:

```
[ ] toggleBold: sem seleção insere **texto** com seleção
[ ] toggleBold: com seleção envolve em **
[ ] toggleBold: texto já negrito remove **
[ ] toggleItalic: sem seleção insere _texto_
[ ] toggleItalic: com seleção envolve em _
[ ] toggleStrikethrough: com seleção envolve em ~~
[ ] setHeading(1): linha vazia insere # 
[ ] setHeading(1): linha com texto prefixa com #
[ ] setHeading(1): heading existente faz toggle
[ ] toggleList unordered: insere - 
[ ] toggleList ordered: insere 1. 
[ ] toggleList task: insere - [ ] 
[ ] insertLink: insere [texto](url) com cursor em url
[ ] insertImage: insere ![alt](caminho)
[ ] toggleCode: envolve em backticks
[ ] insertCodeBlock: insere bloco multilinha
[ ] insertDivider: insere ---
[ ] insertBlockquote: prefila linha com >
```

---

## WBS-GM-008.02

Subtarefa: Suíte Slash Commands

Artefato:

```
tests/editor/slash-commands.test.ts   [CRIAR]
```

Casos:

```
[ ] / em linha vazia: abre menu
[ ] / em meio de palavra: não abre menu
[ ] Filtro por "tab": exibe Tabela
[ ] Filtro por "titulo": exibe H1, H2, H3
[ ] Enter seleciona item
[ ] ESC fecha sem inserir
[ ] / removido após seleção
[ ] Todos os 17 itens presentes no catálogo
[ ] Inserção de cada item produz Markdown correto
```

---

## WBS-GM-008.03

Subtarefa: Suíte Smart Paste

Artefato:

```
tests/editor/smart-paste.test.ts   [CRIAR]
```

Casos (já detalhados em WBS-GM-003.05):

```
[ ] h1-h6 convertidos
[ ] strong/b → **texto**
[ ] em/i → _texto_
[ ] ul/li → lista
[ ] ol/li → lista numerada
[ ] a[href] → [texto](url)
[ ] img → ![alt](src)
[ ] code → `código`
[ ] pre/code → bloco ```
[ ] blockquote → >
[ ] texto simples → sem alteração
```

---

## WBS-GM-008.04

Subtarefa: Suíte Document Templates

Artefato:

```
tests/editor/templates.test.ts   [CRIAR]
```

Casos:

```
[ ] Template meeting: contém # Reunião e data atual
[ ] Template report: contém ## Sumário Executivo
[ ] Template notes: contém ## Conceitos principais
[ ] Template spec: contém ## Critérios de Aceitação
[ ] Template diary: contém data atual
[ ] Template readme: contém ## Instalação e bloco bash
[ ] {{data}} substituída pela data no formato DD/MM/AAAA
[ ] Conteúdo não vazio para todos os templates
```

---

## WBS-GM-008.05

Subtarefa: Suíte Table Editor

Artefato:

```
tests/editor/table-editor.test.ts   [CRIAR]
```

Casos:

```
[ ] insertTable(3, 2): insere tabela 3x2 corretamente
[ ] parseTable: lê estrutura corretamente
[ ] serializeTable: gera Markdown correto
[ ] addColumn: adiciona coluna na posição correta
[ ] removeColumn: remove coluna sem quebrar estrutura
[ ] addRow: adiciona linha ao final
[ ] setColumnAlignment: gera separador correto
```

---

## WBS-GM-008.06

Subtarefa: Suíte HTML to Markdown

Artefato:

```
tests/editor/html-to-md.test.ts   [CRIAR]
```

(Detalhados em WBS-GM-003.05)

---

## WBS-GM-008.07

Subtarefa: Teste de Regressão Completo

Verificar que a Onda 0 não foi quebrada:

```
[ ] Pipeline Markdown preservado (processor.test.ts passa)
[ ] KaTeX preservado (math.test.ts passa)
[ ] Mermaid preservado (mermaid.test.ts passa)
[ ] GitHub Alerts preservados (extensions.test.ts passa)
[ ] Export HTML preservado (export.test.ts passa)
[ ] File Tree Explorer funciona
[ ] Quick Switcher funciona
[ ] Status Bar funciona
[ ] Salvar documento funciona
[ ] Todos os 40 testes anteriores passam
```

---

## WBS-GM-008.08

Subtarefa: Validação manual dos módulos

Checklist de validação manual (não automatizável):

```
[ ] Toolbar visível e responsiva
[ ] Botões tooltip com nome e atalho
[ ] Slash menu posicionado corretamente abaixo do cursor
[ ] Smart paste com conteúdo do Google Docs
[ ] Smart paste com conteúdo de página web
[ ] Modal de templates com grid de cards
[ ] Cheatsheet com scroll quando necessário
[ ] Hints com delay correto (não intrusivo)
[ ] TableToolbar contextual aparece e desaparece
[ ] Tab navega corretamente em tabela
```

---

## Critérios de Aceitação — WBS-GM-008

```
[ ] Todos os novos testes passam 100%
[ ] Todos os 40 testes da Onda 0 continuam passando
[ ] Total de testes após onda: >= 80
[ ] Validação manual: todos os 10 itens aprovados
[ ] vitest run: 0 falhas
[ ] cargo test: 0 falhas (regressão backend)
```

Verify: `qa_guided_markdown_pass`

---

# SUMÁRIO FINAL

## Contagem de subtarefas

```
WBS-GM-001  Formatting Toolbar        8 subtarefas
WBS-GM-002  Slash Commands            7 subtarefas
WBS-GM-003  Smart Paste               5 subtarefas
WBS-GM-004  Document Templates        5 subtarefas
WBS-GM-005  Markdown Cheatsheet       4 subtarefas
WBS-GM-006  Markdown Hints            4 subtarefas
WBS-GM-007  Table Editor              4 subtarefas
WBS-GM-008  QA Guided Markdown        8 subtarefas

Total módulos:     8
Total subtarefas:  45
Total testes:      ~40 novos + 40 regressão = 80+
```

---

## Artefatos novos

```
Componentes React (src/components/)
  FormattingToolbar.tsx
  ToolbarButton.tsx
  ToolbarGroup.tsx
  SlashMenu.tsx
  SlashMenuItem.tsx
  NewDocumentModal.tsx
  TemplateCard.tsx
  TableToolbar.tsx
  MarkdownCheatsheet.tsx
  CheatsheetRow.tsx

Editor Extensions (src/editor/)
  formatting/bold.ts
  formatting/italic.ts
  formatting/strikethrough.ts
  formatting/heading.ts
  formatting/link.ts
  formatting/image.ts
  formatting/code.ts
  formatting/list.ts
  formatting/blockquote.ts
  formatting/divider.ts
  formatting/index.ts
  slash/slash-items.ts
  slash/slash-search.ts
  slash/slash-plugin.ts
  paste/html-to-md.ts
  paste/paste-plugin.ts
  table/table-helpers.ts
  table/table-plugin.ts
  hints/hint-definitions.ts
  hints/hint-plugin.ts

Templates (src/templates/)
  blank.ts
  meeting.ts
  report.ts
  notes.ts
  spec.ts
  diary.ts
  readme.ts
  index.ts

Estilos (src/styles/)
  formatting-toolbar.css
  slash-menu.css
  new-document-modal.css
  cheatsheet.css
  hints.css

Testes (tests/editor/)
  formatting-toolbar.test.ts
  slash-commands.test.ts
  smart-paste.test.ts
  html-to-md.test.ts
  templates.test.ts
  table-editor.test.ts
```

---

## Posição no Roadmap Global

```
ONDA 0    UX Foundation         ✓ ENCERRADA
ONDA 0B   Guided Markdown       ← ESTA ONDA
ONDA 1    Knowledge Foundation  → próxima (paralela possível)
ONDA 2    Wiki Links
ONDA 3    Backlinks
...
```

## Critério de Encerramento da Onda 0B

```
[ ] vitest run: 0 falhas (80+ testes)
[ ] cargo test: 0 falhas (sem regressão no Rust)
[ ] Formatting Toolbar: todos os controles funcionando
[ ] Slash Commands: 17 itens inserindo corretamente
[ ] Smart Paste: HTML → Markdown funcionando
[ ] Templates: 7 templates com data dinâmica
[ ] Cheatsheet: todos os itens com cópia
[ ] Hints: tooltips não intrusivos
[ ] Table Editor: Tab/Enter/toolbar contextual
[ ] QA: validação manual aprovada
```

Verify final: `onda_0b_guided_markdown_complete`