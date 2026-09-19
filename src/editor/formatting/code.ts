import type { EditorView } from "@codemirror/view";

export function toggleCode(view: EditorView): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.sliceDoc(from, to);
  const isEmpty = from === to;

  const isCode =
    selectedText.startsWith("`") &&
    selectedText.endsWith("`") &&
    !selectedText.startsWith("```") &&
    selectedText.length >= 2;

  if (isCode) {
    view.dispatch({
      changes: { from, to, insert: selectedText.slice(1, -1) },
      selection: { anchor: from, head: to - 2 },
    });
  } else if (isEmpty) {
    view.dispatch({
      changes: { from, to, insert: "`código`" },
      selection: { anchor: from + 1, head: from + 7 },
    });
  } else {
    view.dispatch({
      changes: { from, to, insert: `\`${selectedText}\`` },
      selection: { anchor: from + 1, head: to + 1 },
    });
  }

  view.focus();
}

export function insertCodeBlock(view: EditorView, language = ""): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.sliceDoc(from, to);

  const insert = `\`\`\`${language}\n${selectedText || "código"}\n\`\`\`\n`;
  view.dispatch({
    changes: { from, to, insert },
    selection: {
      anchor: from + 3 + language.length + 1,
      head: from + 3 + language.length + 1 + (selectedText.length || 6),
    },
  });

  view.focus();
}
