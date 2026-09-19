export interface CheatsheetItem {
  category: string;
  syntax: string;
  result: string;
  copyText: string;
}

export const CHEATSHEET_ITEMS: CheatsheetItem[] = [
  { category: "Headings", syntax: "# Título 1", result: "H1 — Título principal", copyText: "# " },
  { category: "Headings", syntax: "## Título 2", result: "H2 — Subtítulo", copyText: "## " },
  { category: "Headings", syntax: "### Título 3", result: "H3 — Seção", copyText: "### " },
  { category: "Formatação", syntax: "**negrito**", result: "negrito", copyText: "**texto**" },
  { category: "Formatação", syntax: "_itálico_", result: "itálico", copyText: "_texto_" },
  { category: "Formatação", syntax: "~~tachado~~", result: "~~tachado~~", copyText: "~~texto~~" },
  { category: "Formatação", syntax: "`código`", result: "código inline", copyText: "`código`" },
  { category: "Listas", syntax: "- item", result: "• item", copyText: "- " },
  { category: "Listas", syntax: "1. item", result: "1. item", copyText: "1. " },
  { category: "Listas", syntax: "- [ ] tarefa", result: "☐ tarefa", copyText: "- [ ] " },
  { category: "Listas", syntax: "- [x] feita", result: "☑ feita", copyText: "- [x] " },
  { category: "Links", syntax: "[texto](url)", result: "texto (link)", copyText: "[texto](url)" },
  { category: "Links", syntax: "![alt](img.png)", result: "[imagem]", copyText: "![alt](url)" },
  { category: "Blocos", syntax: "> citação", result: "│ citação", copyText: "> " },
  { category: "Blocos", syntax: "---", result: "─────────", copyText: "---" },
  { category: "Blocos", syntax: "```\ncódigo\n```", result: "bloco de código", copyText: "```\n\n```" },
  { category: "Alertas", syntax: "> [!NOTE]\n> texto", result: "📌 Nota", copyText: "> [!NOTE]\n> " },
  { category: "Alertas", syntax: "> [!TIP]\n> texto", result: "💡 Dica", copyText: "> [!TIP]\n> " },
  { category: "Alertas", syntax: "> [!WARNING]\n> texto", result: "⚠ Aviso", copyText: "> [!WARNING]\n> " },
  { category: "Tabelas", syntax: "| Col | Col |\n| --- | --- |\n| val | val |", result: "Tabela", copyText: "| Coluna 1 | Coluna 2 |\n| -------- | -------- |\n| valor    | valor    |\n" },
];
