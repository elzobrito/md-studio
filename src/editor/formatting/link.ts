import type { EditorView } from "@codemirror/view";

export function insertLink(view: EditorView): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.sliceDoc(from, to);

  if (selectedText.length > 0) {
    const insert = `[${selectedText}](url)`;
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + selectedText.length + 3, head: from + selectedText.length + 6 },
    });
  } else {
    const insert = "[texto](url)";
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + 8, head: from + 11 },
    });
  }

  view.focus();
}
