import type { EditorView } from "@codemirror/view";

export function insertDivider(view: EditorView): void {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);

  const prefix = line.text.trim().length > 0 ? "\n\n---\n\n" : "---\n\n";
  view.dispatch({
    changes: { from: line.to, insert: prefix },
    selection: { anchor: line.to + prefix.length },
  });

  view.focus();
}
