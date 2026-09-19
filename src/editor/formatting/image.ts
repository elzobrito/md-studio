import type { EditorView } from "@codemirror/view";

export function insertImage(view: EditorView): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.sliceDoc(from, to);

  const alt = selectedText || "descrição";
  const insert = `![${alt}](caminho/imagem.png)`;

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + alt.length + 4, head: from + insert.length - 1 },
  });

  view.focus();
}
