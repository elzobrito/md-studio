ONDA 0B — Guided Markdown | MD-GM-007
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-007)
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
# WBS-GM-007

# Table Editor Assistido

Módulo origem: Módulo 7
Prioridade: MÉDIA
Sprint: GM-C
Depende de: WBS-GM-001, WBS-GM-002

---

## WBS-GM-007.01

Subtarefa: Implementar table-helpers

Artefato:

```
src/editor/table/table-helpers.ts   [CRIAR]
```

Funções necessárias:

```typescript
// Detectar se cursor está dentro de tabela Markdown
export function isInTable(view: EditorView): boolean

// Obter a tabela atual como estrutura de dados
export interface TableData {
  rows: string[][];
  alignments: ('left' | 'center' | 'right' | null)[];
  startLine: number;
  endLine: number;
}
export function parseTable(view: EditorView): TableData | null

// Serializar de volta para Markdown
export function serializeTable(data: TableData): string

// Navegação entre células
export function moveToNextCell(view: EditorView): void
export function moveToPrevCell(view: EditorView): void
export function moveToNextRow(view: EditorView): void

// Manipulação estrutural
export function addColumn(view: EditorView, after: number): void
export function removeColumn(view: EditorView, index: number): void
export function addRow(view: EditorView, after: number): void
export function removeRow(view: EditorView, index: number): void
export function setColumnAlignment(
  view: EditorView,
  col: number,
  align: 'left' | 'center' | 'right'
): void

// Inserção inicial de tabela
export function insertTable(
  view: EditorView,
  cols: number,
  rows: number
): void
```

Exemplo de serializeTable:

```typescript
export function serializeTable(data: TableData): string {
  // Calcular larguras de colunas para alinhamento
  const colWidths = data.alignments.map((_, i) =>
    Math.max(...data.rows.map(row => (row[i] || '').length), 6)
  );

  // Linha de cabeçalho
  const header = '| ' + data.rows[0].map((cell, i) =>
    cell.padEnd(colWidths[i])
  ).join(' | ') + ' |';

  // Linha de separador
  const separator = '| ' + data.alignments.map((align, i) => {
    const w = colWidths[i];
    if (align === 'center') return ':' + '-'.repeat(w - 2) + ':';
    if (align === 'right') return '-'.repeat(w - 1) + ':';
    return '-'.repeat(w);
  }).join(' | ') + ' |';

  // Linhas de dados
  const dataRows = data.rows.slice(1).map(row =>
    '| ' + row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') + ' |'
  );

  return [header, separator, ...dataRows].join('\n');
}
```

---

## WBS-GM-007.02

Subtarefa: Implementar table-plugin para CodeMirror 6

Artefato:

```
src/editor/table/table-plugin.ts   [CRIAR]
```

Interceptações de teclado:

```typescript
export const tableKeymap = keymap.of([
  {
    key: 'Tab',
    run: (view) => {
      if (isInTable(view)) {
        moveToNextCell(view);
        return true; // intercepta o Tab
      }
      return false;
    }
  },
  {
    key: 'Shift-Tab',
    run: (view) => {
      if (isInTable(view)) {
        moveToPrevCell(view);
        return true;
      }
      return false;
    }
  },
  {
    key: 'Enter',
    run: (view) => {
      if (isInTable(view)) {
        moveToNextRow(view);
        return true;
      }
      return false;
    }
  }
]);
```

---

## WBS-GM-007.03

Subtarefa: Implementar TableToolbar (toolbar contextual)

Artefato:

```
src/components/editor/TableToolbar.tsx   [CRIAR]
```

Visibilidade:

```
Cursor dentro de tabela  → toolbar de tabela VISÍVEL
Cursor fora de tabela    → toolbar de tabela OCULTA
```

Layout:

```
╔════════════════════════════════════════════════════════════════╗
║  TOOLBAR (contexto: tabela)                                    ║
║  [+col] [-col]  │  [+linha] [-linha]  │  [←] [↔] [→] alinhar ║
╚════════════════════════════════════════════════════════════════╝
```

Botões:

```
[+col]   Adicionar coluna após a atual
[-col]   Remover coluna atual
[+linha] Adicionar linha após a atual
[-linha] Remover linha atual
[←]      Alinhar coluna à esquerda
[↔]      Centralizar coluna
[→]      Alinhar coluna à direita
```

---

## WBS-GM-007.04

Subtarefa: Implementar detecção de contexto de tabela

A FormattingToolbar deve renderizar a TableToolbar
condicionalmente quando o cursor está em uma tabela.

Artefato:

```
src/components/editor/FormattingToolbar.tsx   [MODIFICAR]
```

```typescript
// Hook para detectar contexto do cursor
function useCursorContext(view: EditorView | null) {
  const [isInTableContext, setIsInTableContext] = useState(false);

  useEffect(() => {
    if (!view) return;
    // Observer de mudanças de seleção
    // Verificar isInTable(view) e atualizar estado
  }, [view]);

  return { isInTableContext };
}
```

---

## Critérios de Aceitação — WBS-GM-007

```
[ ] /tabela (Slash Command) insere tabela com 3 colunas e 2 linhas
[ ] Tab navega para a próxima célula
[ ] Shift+Tab volta para a célula anterior
[ ] Tab na última célula cria nova linha
[ ] Enter cria nova linha abaixo
[ ] TableToolbar aparece ao entrar em tabela
[ ] TableToolbar desaparece ao sair da tabela
[ ] [+col] adiciona coluna após a atual
[ ] [-col] remove coluna atual
[ ] [+linha] adiciona linha após a atual
[ ] [-linha] remove linha atual
[ ] [←][↔][→] configuram alinhamento da coluna
[ ] Tabela serializada corretamente com alinhamento visual
```

Verify: `table_editor_pass`

---