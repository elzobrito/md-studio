import type { EditorView } from "@codemirror/view";

export type ListType = "unordered" | "ordered" | "task";

const PREFIX_MAP: Record<ListType, string> = {
  unordered: "- ",
  ordered: "1. ",
  task: "- [ ] ",
};

const LIST_REGEX = /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/;

export function toggleList(view: EditorView, type: ListType): void {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const text = line.text;

  const targetPrefix = PREFIX_MAP[type];
  const match = text.match(LIST_REGEX);

  if (match) {
    const existingPrefix = match[2];
    const indent = match[1];
    const rest = text.slice(match[0].length);

    // If already the exact type, toggle off (remove list marker)
    if (
      (type === "unordered" && /^[-*+]\s+$/.test(existingPrefix)) ||
      (type === "ordered" && /^\d+\.\s+$/.test(existingPrefix)) ||
      (type === "task" && /^[-*+]\s+\[[ xX]\]\s+$/.test(existingPrefix))
    ) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: indent + rest },
        selection: { anchor: line.from + indent.length + rest.length },
      });
    } else {
      // Switch type
      const newText = indent + targetPrefix + rest;
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newText },
        selection: { anchor: line.from + newText.length },
      });
    }
  } else {
    // Add prefix
    const newText = targetPrefix + text;
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: newText },
      selection: { anchor: line.from + newText.length },
    });
  }

  view.focus();
}
