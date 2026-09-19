import type { EditorView } from "@codemirror/view";

export function insertBlockquote(view: EditorView): void {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const text = line.text;

  if (text.startsWith("> ")) {
    // Toggle off
    const newText = text.slice(2);
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: newText },
      selection: { anchor: line.from + newText.length },
    });
  } else {
    const newText = `> ${text}`;
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: newText },
      selection: { anchor: line.from + newText.length },
    });
  }

  view.focus();
}
