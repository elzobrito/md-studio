import type { EditorView } from "@codemirror/view";
import {
  setHeading,
  insertDivider,
  toggleList,
  insertBlockquote,
  toggleCode,
  insertCodeBlock,
  insertLink,
  insertImage,
} from "../formatting";

export interface SlashItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  insert: (view: EditorView) => void;
}

export function insertTable(view: EditorView, cols = 3, rows = 2): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.from);
  const header = "| " + Array.from({ length: cols }, (_, i) => `Coluna ${i + 1}`).join(" | ") + " |\n";
  const sep = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |\n";
  const rowLines = Array.from({ length: rows }, () => "| " + Array.from({ length: cols }, () => "Item").join(" | ") + " |\n").join("");
  const table = `${header}${sep}${rowLines}`;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: table },
    selection: { anchor: line.from + header.length + sep.length + 2 },
  });
  view.focus();
}

export function insertAlert(view: EditorView, type: "NOTE" | "TIP" | "WARNING"): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.from);
  const text = `> [!${type}]\n> `;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: text },
    selection: { anchor: line.from + text.length },
  });
  view.focus();
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    id: "text",
    label: "Texto",
    description: "Parágrafo normal",
    icon: "📝",
    keywords: ["texto", "paragrafo", "normal"],
    insert: (view) => {
      // Line is already cleared of slash, nothing to do
      view.focus();
    },
  },
  {
    id: "h1",
    label: "Título 1",
    description: "Cabeçalho principal",
    icon: "H1",
    keywords: ["titulo", "h1", "heading", "cabecalho"],
    insert: (view) => setHeading(view, 1),
  },
  {
    id: "h2",
    label: "Título 2",
    description: "Subtítulo",
    icon: "H2",
    keywords: ["subtitulo", "h2", "heading", "cabecalho"],
    insert: (view) => setHeading(view, 2),
  },
  {
    id: "h3",
    label: "Título 3",
    description: "Seção",
    icon: "H3",
    keywords: ["secao", "h3", "heading"],
    insert: (view) => setHeading(view, 3),
  },
  {
    id: "divider",
    label: "Separador",
    description: "Linha horizontal",
    icon: "━━",
    keywords: ["separador", "linha", "divisor", "hr"],
    insert: (view) => insertDivider(view),
  },
  {
    id: "list",
    label: "Lista",
    description: "Tópicos com marcadores",
    icon: "≡",
    keywords: ["lista", "topicos", "bullet", "ul"],
    insert: (view) => toggleList(view, "unordered"),
  },
  {
    id: "ordered-list",
    label: "Lista numerada",
    description: "Itens numerados",
    icon: "1.",
    keywords: ["numerada", "numeracao", "ol"],
    insert: (view) => toggleList(view, "ordered"),
  },
  {
    id: "task-list",
    label: "Tarefas",
    description: "Lista de checklist",
    icon: "☑",
    keywords: ["tarefa", "checklist", "todo", "task"],
    insert: (view) => toggleList(view, "task"),
  },
  {
    id: "blockquote",
    label: "Citação",
    description: "Bloco de destaque",
    icon: "❝",
    keywords: ["citacao", "quote", "blockquote"],
    insert: (view) => insertBlockquote(view),
  },
  {
    id: "code-inline",
    label: "Código inline",
    description: "Trecho de código",
    icon: "`",
    keywords: ["codigo", "code", "inline"],
    insert: (view) => toggleCode(view),
  },
  {
    id: "code-block",
    label: "Bloco de código",
    description: "Código multilinha",
    icon: "```",
    keywords: ["bloco", "codigo", "code", "block", "pre"],
    insert: (view) => insertCodeBlock(view),
  },
  {
    id: "table",
    label: "Tabela",
    description: "Grade de dados",
    icon: "⊞",
    keywords: ["tabela", "table", "grade", "dados"],
    insert: (view) => insertTable(view, 3, 2),
  },
  {
    id: "link",
    label: "Link",
    description: "Texto com hyperlink",
    icon: "🔗",
    keywords: ["link", "url", "hyperlink"],
    insert: (view) => insertLink(view),
  },
  {
    id: "image",
    label: "Imagem",
    description: "Figura ou foto",
    icon: "🖼",
    keywords: ["imagem", "foto", "image", "figura"],
    insert: (view) => insertImage(view),
  },
  {
    id: "alert-warning",
    label: "Aviso",
    description: "Bloco [!WARNING]",
    icon: "⚠",
    keywords: ["aviso", "warning", "alerta"],
    insert: (view) => insertAlert(view, "WARNING"),
  },
  {
    id: "alert-tip",
    label: "Dica",
    description: "Bloco [!TIP]",
    icon: "💡",
    keywords: ["dica", "tip", "sugestao"],
    insert: (view) => insertAlert(view, "TIP"),
  },
  {
    id: "alert-note",
    label: "Nota",
    description: "Bloco [!NOTE]",
    icon: "📌",
    keywords: ["nota", "note", "info"],
    insert: (view) => insertAlert(view, "NOTE"),
  },
];
