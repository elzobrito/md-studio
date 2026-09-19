import type { EditorView } from "@codemirror/view";

export function setHeading(view: EditorView, level: 1 | 2 | 3 | 4 | 5 | 6): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.from);
  const lineText = line.text;

  const headingMatch = lineText.match(/^(#{1,6})\s*/);
  const currentLevel = headingMatch ? headingMatch[1].length : 0;
  const cleanText = headingMatch ? lineText.slice(headingMatch[0].length) : lineText;

  let newText: string;
  if (currentLevel === level) {
    // Toggle off: remove heading prefix
    newText = cleanText;
  } else {
    const prefix = "#".repeat(level) + " ";
    newText = prefix + (cleanText || `Título ${level}`);
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
    selection: { anchor: line.from + newText.length },
  });

  view.focus();
}
