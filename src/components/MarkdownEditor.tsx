import { useCallback, useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import { editorStore } from "../state/editor";
import { FormattingToolbar } from "./editor/FormattingToolbar";
import { SlashMenu } from "./editor/SlashMenu";
import {
  createSlashPlugin,
  executeSlashItem,
  type SlashState,
} from "../editor/slash/slash-plugin";
import { smartPasteExtension } from "../editor/paste/paste-plugin";
import type { SlashItem } from "../editor/slash/slash-items";
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  insertLink,
  toggleCode,
  formatCodeBlockAtCursor,
} from "../editor/formatting";
import {
  createWikiCompletionExtensions,
  type WikiCompletionState,
  type WikiDocumentCandidate,
} from "../editor/wiki/wiki-completion";
import { WikiCompletionMenu } from "./editor/WikiCompletionMenu";
import {
  backlinkLineHighlight,
  backlinkLineTheme,
  consumeQueuedGoToLine,
  goToLineWithHighlight,
} from "../editor/line-highlight";

export const editorCursorExtensions = [
  drawSelection({ cursorBlinkRate: 1200 }),
  EditorView.theme({
    ".cm-cursor, .cm-dropCursor": {
      borderLeftWidth: "2px",
    },
  }),
];

export function MarkdownEditor(props: {
  value: string;
  dirty: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
  onScroller?: (el: HTMLElement | null) => void;
  wikiDocuments?: readonly WikiDocumentCandidate[];
}) {
  const parent = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const wikiDocumentsRef = useRef(props.wikiDocuments ?? []);
  wikiDocumentsRef.current = props.wikiDocuments ?? [];
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const [wikiCompletion, setWikiCompletion] = useState<WikiCompletionState | null>(null);
  const onScroller = props.onScroller;

  const handleSelectSlashItem = useCallback((item: SlashItem) => {
    const view = viewRef.current;
    if (!view || !slashState) return;
    executeSlashItem(view, item, slashState);
    setSlashState(null);
  }, [slashState]);

  const handleCloseSlashMenu = useCallback(() => {
    setSlashState(null);
  }, []);

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
        ...editorCursorExtensions,
        backlinkLineHighlight,
        backlinkLineTheme,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          {
            key: "Mod-b",
            run: (v) => {
              toggleBold(v);
              return true;
            },
          },
          {
            key: "Mod-i",
            run: (v) => {
              toggleItalic(v);
              return true;
            },
          },
          {
            key: "Mod-Shift-s",
            run: (v) => {
              toggleStrikethrough(v);
              return true;
            },
          },
          {
            key: "Mod-k",
            run: (v) => {
              insertLink(v);
              return true;
            },
          },
          {
            key: "Mod-e",
            run: (v) => {
              toggleCode(v);
              return true;
            },
          },
          {
            key: "Shift-Alt-f",
            run: (v) => {
              void formatCodeBlockAtCursor(v);
              return true;
            },
          },
          {
            key: "Shift-Alt-F",
            run: (v) => {
              void formatCodeBlockAtCursor(v);
              return true;
            },
          },
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
        createSlashPlugin(setSlashState),
        smartPasteExtension,
        ...createWikiCompletionExtensions(() => wikiDocumentsRef.current, setWikiCompletion),
      ],
    });
    const view = new EditorView({ state, parent: parent.current });
    viewRef.current = view;
    setEditorView(view);
    editorStore.setTotalLines(view.state.doc.lines);

    const unregisterGoToLine = editorStore.registerGoToLine((targetLine: number) => {
      goToLineWithHighlight(view, targetLine);
    });
    const queued = consumeQueuedGoToLine();
    if (queued != null) {
      goToLineWithHighlight(view, queued);
    }

    onScroller?.(view.scrollDOM);
    return () => {
      unregisterGoToLine();
      onScroller?.(null);
      setEditorView(null);
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
      <FormattingToolbar view={editorView} />
      <div ref={parent} className="editor-host" />
      <SlashMenu
        slashState={slashState}
        onSelect={handleSelectSlashItem}
        onClose={handleCloseSlashMenu}
      />
      <WikiCompletionMenu
        view={editorView}
        state={wikiCompletion}
        onClose={() => setWikiCompletion(null)}
      />
    </section>
  );
}
