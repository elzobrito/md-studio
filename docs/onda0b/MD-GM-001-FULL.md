ONDA 0B — Guided Markdown | MD-GM-001
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-001)
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
# WBS-GM-001

# Formatting Toolbar

Módulo origem: Módulo 1
Prioridade: CRÍTICA
Sprint: GM-A
Depende de: nenhuma

---

## Contexto

Estado atual:

```
O editor não possui nenhum botão de formatação.
O usuário precisa saber a sintaxe de memória.
```

Estado alvo:

```
╔══════════════════════════════════════════════════════════════════════╗
║  EDITOR TOOLBAR                                                      ║
║  [H1][H2][H3]  │  [B][I][S]  │  [🔗][🖼][`][```]  │  [≡][1.][☑]   ║
╠══════════════════════════════════════════════════════════════════════╣
║   1  |                                                               ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## WBS-GM-001.01

Subtarefa: Implementar funções de formatação no CodeMirror 6

Descrição:

Criar as funções que manipulam o estado do editor para
inserir ou remover marcadores Markdown.

Artefato:

```
src/editor/formatting/index.ts       [CRIAR]
src/editor/formatting/bold.ts        [CRIAR]
src/editor/formatting/italic.ts      [CRIAR]
src/editor/formatting/strikethrough.ts [CRIAR]
src/editor/formatting/heading.ts     [CRIAR]
src/editor/formatting/link.ts        [CRIAR]
src/editor/formatting/image.ts       [CRIAR]
src/editor/formatting/code.ts        [CRIAR]
src/editor/formatting/list.ts        [CRIAR]
src/editor/formatting/blockquote.ts  [CRIAR]
src/editor/formatting/divider.ts     [CRIAR]
```

Padrão de implementação (exemplo — bold.ts):

```typescript
import { EditorView } from '@codemirror/view';

export function toggleBold(view: EditorView): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.sliceDoc(from, to);
  const isEmpty = from === to;

  const isBold = selectedText.startsWith('**') &&
                 selectedText.endsWith('**') &&
                 selectedText.length >= 4;

  if (isBold) {
    // Remove negrito
    view.dispatch({
      changes: {
        from,
        to,
        insert: selectedText.slice(2, -2)
      },
      selection: { anchor: from, head: to - 4 }
    });
  } else if (isEmpty) {
    // Sem seleção: insere template e posiciona cursor no meio
    view.dispatch({
      changes: { from, to, insert: '**texto**' },
      selection: { anchor: from + 2, head: from + 6 }
    });
  } else {
    // Texto selecionado: envolve
    view.dispatch({
      changes: { from, to, insert: `**${selectedText}**` },
      selection: { anchor: from + 2, head: to + 2 }
    });
  }

  view.focus();
}
```

Padrão para heading.ts:

```typescript
export function setHeading(view: EditorView, level: 1 | 2 | 3 | 4 | 5 | 6): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.from);
  const lineText = line.text;

  // Remove heading existente se houver
  const headingMatch = lineText.match(/^(#{1,6})\s/);
  const cleanText = headingMatch
    ? lineText.slice(headingMatch[0].length)
    : lineText;

  const prefix = '#'.repeat(level) + ' ';
  const newText = prefix + (cleanText || 'Título');

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
    selection: { anchor: line.from + newText.length }
  });

  view.focus();
}
```

Padrão para list.ts:

```typescript
export type ListType = 'unordered' | 'ordered' | 'task';

export function toggleList(view: EditorView, type: ListType): void {
  const { state } = view;
  const { from, to } = state.selection.main;

  // Detectar se já é lista do mesmo tipo e remover
  // Ou converter entre tipos de lista
  // Ou inserir nova lista

  const prefixMap: Record<ListType, string> = {
    unordered: '- ',
    ordered:   '1. ',
    task:      '- [ ] '
  };

  const prefix = prefixMap[type];
  const line = state.doc.lineAt(from);

  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
    selection: { anchor: line.from + prefix.length }
  });

  view.focus();
}
```

Critérios:

```
[ ] toggleBold: aplica **texto** quando há seleção
[ ] toggleBold: remove ** quando texto já é negrito
[ ] toggleBold: insere **texto** com seleção quando cursor vazio
[ ] toggleItalic: aplica _texto_
[ ] toggleStrikethrough: aplica ~~texto~~
[ ] setHeading: transforma linha atual em heading
[ ] setHeading: remove heading se nível já aplicado (toggle)
[ ] toggleList: insere lista com - prefix
[ ] toggleList: insere lista numerada com 1. prefix
[ ] toggleList: insere task list com - [ ] prefix
[ ] insertLink: insere [texto](url) com cursor em url
[ ] insertImage: insere ![alt](caminho)
[ ] toggleCode: envolve em `backticks` inline
[ ] insertCodeBlock: insere bloco ```\n\n```
[ ] insertDivider: insere ---
[ ] insertBlockquote: insere > prefixando a linha
```

---

## WBS-GM-001.02

Subtarefa: Implementar ToolbarButton

Descrição:

Componente base para todos os botões da toolbar.

Artefato:

```
src/components/editor/ToolbarButton.tsx   [CRIAR]
```

Interface:

```typescript
interface ToolbarButtonProps {
  icon: string | React.ReactNode;
  label: string;        // tooltip
  shortcut?: string;    // exibido no tooltip: "Ctrl+B"
  onClick: () => void;
  isActive?: boolean;   // estado toggleado (heading ativo, etc.)
  disabled?: boolean;
}
```

Visual:

```
Normal:   fundo transparente, hover com fundo leve
Ativo:    fundo de destaque (ex: heading aplicado)
Disabled: opacidade 50%
Tooltip:  label + shortcut ao hover (delay 500ms)
```

---

## WBS-GM-001.03

Subtarefa: Implementar ToolbarGroup

Descrição:

Agrupa botões com separador visual entre grupos.

Artefato:

```
src/components/editor/ToolbarGroup.tsx   [CRIAR]
```

Visual:

```
[btn][btn][btn]  │  [btn][btn]  │  [btn][btn][btn]
                 ↑              ↑
              separador      separador
```

---

## WBS-GM-001.04

Subtarefa: Implementar FormattingToolbar

Descrição:

Componente principal da barra de formatação.

Artefato:

```
src/components/editor/FormattingToolbar.tsx   [CRIAR]
```

Grupos e botões:

```
Grupo 1 — Headings
  [H1]  Título nível 1    setHeading(1)
  [H2]  Título nível 2    setHeading(2)
  [H3]  Título nível 3    setHeading(3)

Grupo 2 — Formatação Inline
  [B]   Negrito           toggleBold()       Ctrl+B
  [I]   Itálico           toggleItalic()     Ctrl+I
  [S]   Tachado           toggleStrikethrough()

Grupo 3 — Inserções
  [🔗]  Link              insertLink()
  [🖼]  Imagem            insertImage()
  [`]   Código inline     toggleCode()
  [```] Bloco código      insertCodeBlock()

Grupo 4 — Estrutura
  [≡]   Lista tópicos     toggleList('unordered')
  [1.]  Lista numerada    toggleList('ordered')
  [☑]   Lista tarefas     toggleList('task')
  [❝]   Citação           insertBlockquote()
  [─]   Separador         insertDivider()
```

Visibilidade:

```
Modo Source  → toolbar VISÍVEL
Modo Split   → toolbar VISÍVEL (acima do editor)
Modo Preview → toolbar OCULTA
```

---

## WBS-GM-001.05

Subtarefa: Integrar toolbar no MarkdownEditor

Artefato:

```
src/editor/MarkdownEditor.tsx   [MODIFICAR]
```

Posição:

```
┌──────────────────────────────────────────┐
│  [H1][H2][H3] │ [B][I][S] │ [🔗][`][≡] │ ← FormattingToolbar
├──────────────────────────────────────────┤
│  1  |                                    │ ← CodeMirror
│  2  |                                    │
└──────────────────────────────────────────┘
```

Passar referência do EditorView para a toolbar.

---

## WBS-GM-001.06

Subtarefa: Registrar atalhos de teclado da toolbar

Artefato:

```
src/hooks/useKeyboardShortcuts.ts   [MODIFICAR]
```

Atalhos a registrar:

```
Ctrl+B           toggleBold
Ctrl+I           toggleItalic
Ctrl+Shift+S     toggleStrikethrough
Ctrl+Shift+K     insertLink
Ctrl+E           toggleCode
```

---

## WBS-GM-001.07

Subtarefa: Estilização da toolbar

Artefato:

```
src/styles/formatting-toolbar.css   [CRIAR]
```

Especificações:

```css
.formatting-toolbar {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.toolbar-button {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.toolbar-button:hover {
  background: var(--color-hover);
}

.toolbar-button.active {
  background: var(--color-selection);
  color: var(--color-accent);
}

.toolbar-separator {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 6px;
}
```

---

## WBS-GM-001.08

Subtarefa: Toggle de visibilidade da toolbar

Adicionar opção nas configurações:

```
Settings → Editor → Barra de formatação: [✓] Visível
```

Artefato:

```
src/state/settings.ts                          [MODIFICAR]
src/components/settings/EditorSettings.tsx     [MODIFICAR]
```

---

## Critérios de Aceitação — WBS-GM-001

```
[ ] Toolbar visível acima do editor nos modos Source e Split
[ ] Toolbar oculta no modo Preview
[ ] [H1] transforma linha atual em # Heading
[ ] [H2] transforma linha atual em ## Heading
[ ] [H3] transforma linha atual em ### Heading
[ ] [B] aplica **negrito** ao texto selecionado
[ ] [B] remove **negrito** se já aplicado (toggle)
[ ] [B] insere **texto** com seleção quando cursor vazio
[ ] [I] aplica _itálico_
[ ] [S] aplica ~~tachado~~
[ ] [🔗] insere [texto](url) com cursor em url
[ ] [🖼] insere ![alt](caminho)
[ ] [`] insere `código` inline
[ ] [```] insere bloco de código
[ ] [≡] insere - lista
[ ] [1.] insere 1. lista
[ ] [☑] insere - [ ] lista
[ ] [❝] insere > citação
[ ] [─] insere ---
[ ] Ctrl+B funciona sem clicar na toolbar
[ ] Ctrl+I funciona sem clicar na toolbar
[ ] Tooltip com nome e atalho ao hover
[ ] Toggle de visibilidade nas configurações
[ ] Nenhuma regressão no comportamento do editor
```

Verify: `formatting_toolbar_pass`

---