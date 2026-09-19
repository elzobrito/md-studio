import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import { editorStore } from "../state/editor";

export function MarkdownEditor(props: {
  value: string;
  dirty: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
  onScroller?: (el: HTMLElement | null) => void;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onScroller = props.onScroller;

  useEffect(() => {
    if (!parent.current) return;
    const state = EditorState.create({
      doc: props.value,
      extensions: [
        lineNumbers(),
        history(),
        markdown(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          {
            key: "Mod-s",
            run: () => {
              props.onSave();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            props.onChange(u.state.doc.toString());
            editorStore.setTotalLines(u.state.doc.lines);
          }
          if (u.selectionSet || u.docChanged) {
            const pos = u.state.selection.main.head;
            const line = u.state.doc.lineAt(pos);
            const col = pos - line.from + 1;
            editorStore.setCursor(line.number, col);
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: parent.current });
    viewRef.current = view;
    editorStore.setTotalLines(view.state.doc.lines);

    const unregisterGoToLine = editorStore.registerGoToLine((targetLine: number) => {
      const doc = view.state.doc;
      const validLine = Math.max(1, Math.min(targetLine, doc.lines));
      const line = doc.line(validLine);
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      view.focus();
    });

    onScroller?.(view.scrollDOM);
    return () => {
      unregisterGoToLine();
      onScroller?.(null);
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== props.value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: props.value },
      });
    }
  }, [props.value]);

  return (
    <section className="editor" aria-label="Editor Markdown">
      <header>
        <span>{props.dirty ? "Modificado" : "Salvo"}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={props.onSave}>
          Salvar
        </button>
      </header>
      <div ref={parent} className="editor-host" />
    </section>
  );
}
