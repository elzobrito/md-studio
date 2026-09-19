import type { EditorView } from "@codemirror/view";

export function toggleItalic(view: EditorView): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.sliceDoc(from, to);
  const isEmpty = from === to;

  const isItalic =
    (selectedText.startsWith("*") && selectedText.endsWith("*") && !selectedText.startsWith("**")) ||
    (selectedText.startsWith("_") && selectedText.endsWith("_") && !selectedText.startsWith("__"));

  if (isItalic && selectedText.length >= 2) {
    view.dispatch({
      changes: {
        from,
        to,
        insert: selectedText.slice(1, -1),
      },
      selection: { anchor: from, head: to - 2 },
    });
  } else if (isEmpty) {
    view.dispatch({
      changes: { from, to, insert: "_texto_" },
      selection: { anchor: from + 1, head: from + 6 },
    });
  } else {
    view.dispatch({
      changes: { from, to, insert: `_${selectedText}_` },
      selection: { anchor: from + 1, head: to + 1 },
    });
  }

  view.focus();
}
