ONDA 0B — Guided Markdown | MD-GM-002
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-002)
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
# WBS-GM-002

# Slash Commands

Módulo origem: Módulo 2
Prioridade: ALTA
Sprint: GM-B
Depende de: nenhuma (integra com WBS-GM-007 para tabela)

---

## Contexto

Ao digitar `/` em uma linha vazia, abre um menu contextual
com todos os elementos disponíveis para inserção.

---

## WBS-GM-002.01

Subtarefa: Definir catálogo de Slash Items

Artefato:

```
src/editor/slash/slash-items.ts   [CRIAR]
```

```typescript
export interface SlashItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];    // para busca fuzzy
  insert: (view: EditorView) => void;
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    id: 'text',
    label: 'Texto',
    description: 'Parágrafo normal',
    icon: '📝',
    keywords: ['texto', 'paragrafo', 'normal'],
    insert: (view) => { /* noop — cursor na linha */ }
  },
  {
    id: 'h1',
    label: 'Título 1',
    description: 'Cabeçalho principal',
    icon: 'H1',
    keywords: ['titulo', 'h1', 'heading', 'cabecalho'],
    insert: (view) => setHeading(view, 1)
  },
  {
    id: 'h2',
    label: 'Título 2',
    description: 'Subtítulo',
    icon: 'H2',
    keywords: ['subtitulo', 'h2', 'heading', 'cabecalho'],
    insert: (view) => setHeading(view, 2)
  },
  {
    id: 'h3',
    label: 'Título 3',
    description: 'Seção',
    icon: 'H3',
    keywords: ['secao', 'h3', 'heading'],
    insert: (view) => setHeading(view, 3)
  },
  {
    id: 'divider',
    label: 'Separador',
    description: 'Linha horizontal',
    icon: '━━',
    keywords: ['separador', 'linha', 'divisor', 'hr'],
    insert: (view) => insertDivider(view)
  },
  {
    id: 'list',
    label: 'Lista',
    description: 'Tópicos com marcadores',
    icon: '≡',
    keywords: ['lista', 'topicos', 'bullet', 'ul'],
    insert: (view) => toggleList(view, 'unordered')
  },
  {
    id: 'ordered-list',
    label: 'Lista numerada',
    description: 'Itens numerados',
    icon: '1.',
    keywords: ['numerada', 'numeracao', 'ol'],
    insert: (view) => toggleList(view, 'ordered')
  },
  {
    id: 'task-list',
    label: 'Tarefas',
    description: 'Lista de checklist',
    icon: '☑',
    keywords: ['tarefa', 'checklist', 'todo', 'task'],
    insert: (view) => toggleList(view, 'task')
  },
  {
    id: 'blockquote',
    label: 'Citação',
    description: 'Bloco de destaque',
    icon: '❝',
    keywords: ['citacao', 'quote', 'blockquote'],
    insert: (view) => insertBlockquote(view)
  },
  {
    id: 'code-inline',
    label: 'Código inline',
    description: 'Trecho de código',
    icon: '`',
    keywords: ['codigo', 'code', 'inline'],
    insert: (view) => toggleCode(view)
  },
  {
    id: 'code-block',
    label: 'Bloco de código',
    description: 'Código multilinha',
    icon: '```',
    keywords: ['bloco', 'codigo', 'code', 'block', 'pre'],
    insert: (view) => insertCodeBlock(view)
  },
  {
    id: 'table',
    label: 'Tabela',
    description: 'Grade de dados',
    icon: '⊞',
    keywords: ['tabela', 'table', 'grade', 'dados'],
    insert: (view) => insertTable(view, 3, 2)
  },
  {
    id: 'link',
    label: 'Link',
    description: 'Texto com hyperlink',
    icon: '🔗',
    keywords: ['link', 'url', 'hyperlink'],
    insert: (view) => insertLink(view)
  },
  {
    id: 'image',
    label: 'Imagem',
    description: 'Figura ou foto',
    icon: '🖼',
    keywords: ['imagem', 'foto', 'image', 'figura'],
    insert: (view) => insertImage(view)
  },
  {
    id: 'alert-warning',
    label: 'Aviso',
    description: 'Bloco [!WARNING]',
    icon: '⚠',
    keywords: ['aviso', 'warning', 'alerta'],
    insert: (view) => insertAlert(view, 'WARNING')
  },
  {
    id: 'alert-tip',
    label: 'Dica',
    description: 'Bloco [!TIP]',
    icon: '💡',
    keywords: ['dica', 'tip', 'sugestao'],
    insert: (view) => insertAlert(view, 'TIP')
  },
  {
    id: 'alert-note',
    label: 'Nota',
    description: 'Bloco [!NOTE]',
    icon: '📌',
    keywords: ['nota', 'note', 'info'],
    insert: (view) => insertAlert(view, 'NOTE')
  },
];
```

Total: 17 itens.

---

## WBS-GM-002.02

Subtarefa: Implementar busca fuzzy dos itens

Artefato:

```
src/editor/slash/slash-search.ts   [CRIAR]
```

```typescript
export function filterSlashItems(
  query: string,
  items: SlashItem[]
): SlashItem[] {
  if (!query) return items;

  const q = query.toLowerCase();
  return items.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.keywords.some(k => k.includes(q))
  );
}
```

---

## WBS-GM-002.03

Subtarefa: Implementar SlashMenuItem

Artefato:

```
src/components/editor/SlashMenuItem.tsx   [CRIAR]
```

Layout de cada item:

```
┌──────────────────────────────────────────┐
│  ⊞  Tabela        Grade de dados         │  ← item normal
├──────────────────────────────────────────┤
│  ⊞  Tabela        Grade de dados         │  ← item selecionado (highlight)
└──────────────────────────────────────────┘
```

---

## WBS-GM-002.04

Subtarefa: Implementar SlashMenu

Artefato:

```
src/components/editor/SlashMenu.tsx   [CRIAR]
```

Comportamento completo:

```
Renderiza lista de SlashItem filtrados
Gerencia item selecionado (índice)
Navegação por ↑↓
Confirmação por Enter
Cancelamento por ESC ou Backspace total
Posicionamento absoluto abaixo do cursor
```

Posicionamento:

```typescript
// Calcular coordenadas do cursor no editor
const cursorCoords = view.coordsAtPos(view.state.selection.main.from);
// Posicionar o menu abaixo do cursor
menu.style.top = `${cursorCoords.bottom}px`;
menu.style.left = `${cursorCoords.left}px`;
```

---

## WBS-GM-002.05

Subtarefa: Implementar slash-plugin para CodeMirror 6

Artefato:

```
src/editor/slash/slash-plugin.ts   [CRIAR]
```

Lógica:

```typescript
// Detectar quando o usuário digita /
// Somente em linha vazia ou início de linha
// Capturar o texto após / para filtrar
// Abrir/fechar SlashMenu
// Interceptar ↑↓ e Enter quando menu está aberto
// Remover o / ao confirmar a seleção
```

Regra de ativação:

```
/ em linha vazia           → ativa
/ no início de linha       → ativa
/ no meio de palavra       → NÃO ativa
/ dentro de code block     → NÃO ativa
```

---

## WBS-GM-002.06

Subtarefa: Estilização do SlashMenu

Artefato:

```
src/styles/slash-menu.css   [CRIAR]
```

Especificações:

```css
.slash-menu {
  position: fixed;
  z-index: 1000;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  padding: 4px 0;
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.slash-menu-item:hover,
.slash-menu-item.selected {
  background: var(--color-hover);
}

.slash-item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.slash-item-label {
  font-size: 13px;
  font-weight: 600;
}

.slash-item-description {
  font-size: 12px;
  color: var(--text-secondary);
}
```

---

## WBS-GM-002.07

Subtarefa: Integrar SlashMenu no MarkdownEditor

Artefato:

```
src/editor/MarkdownEditor.tsx   [MODIFICAR]
```

Adicionar slashPlugin à lista de extensions do CodeMirror.
Renderizar SlashMenu como portal React fora do editor.

---

## Critérios de Aceitação — WBS-GM-002

```
[ ] / em linha vazia abre o menu
[ ] / no início de linha abre o menu
[ ] / no meio de texto NÃO abre o menu
[ ] / dentro de code block NÃO abre o menu
[ ] Digitação após / filtra os itens em tempo real
[ ] Setas ↑↓ navegam pelos itens
[ ] Enter confirma e insere o elemento
[ ] ESC fecha sem inserir nada
[ ] / é removido automaticamente após seleção
[ ] Todos os 17 itens listados sem filtro
[ ] Cursor posicionado corretamente após cada inserção
[ ] Menu fecha ao clicar fora
[ ] Nenhuma regressão no editor existente
```

Verify: `slash_commands_pass`

---