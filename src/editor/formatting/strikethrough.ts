import type { EditorView } from "@codemirror/view";

export function toggleStrikethrough(view: EditorView): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.sliceDoc(from, to);
  const isEmpty = from === to;

  const isStrikethrough =
    selectedText.startsWith("~~") &&
    selectedText.endsWith("~~") &&
    selectedText.length >= 4;

  if (isStrikethrough) {
    view.dispatch({
      changes: {
        from,
        to,
        insert: selectedText.slice(2, -2),
      },
      selection: { anchor: from, head: to - 4 },
    });
  } else if (isEmpty) {
    view.dispatch({
      changes: { from, to, insert: "~~texto~~" },
      selection: { anchor: from + 2, head: from + 7 },
    });
  } else {
    view.dispatch({
      changes: { from, to, insert: `~~${selectedText}~~` },
      selection: { anchor: from + 2, head: to + 2 },
    });
  }

  view.focus();
}
