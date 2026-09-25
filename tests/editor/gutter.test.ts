import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import {
  editorGutterExtensions,
  editorGutterTheme,
} from "../../src/components/MarkdownEditor";

let view: EditorView | null = null;

afterEach(() => {
  view?.destroy();
  view = null;
  document.body.innerHTML = "";
});

describe("MD-UI-006: CodeMirror Gutter & Active Line Integration", () => {
  it("installs gutter extensions and theme without error", () => {
    expect(editorGutterExtensions).toBeDefined();
    expect(editorGutterExtensions.length).toBeGreaterThanOrEqual(4);
    expect(editorGutterTheme).toBeDefined();
  });

  it("renders line numbers gutter with active line gutter and active line highlight", () => {
    const parent = document.createElement("div");
    document.body.append(parent);

    view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "Linha 1\nLinha 2\nLinha 3\nLinha 4",
        extensions: editorGutterExtensions,
      }),
    });

    view.focus();

    // Verify gutters container exists
    const gutters = parent.querySelector<HTMLElement>(".cm-gutters");
    expect(gutters).not.toBeNull();

    // Verify line number elements
    const lineNumbers = parent.querySelectorAll<HTMLElement>(
      ".cm-lineNumbers .cm-gutterElement"
    );
    expect(lineNumbers.length).toBeGreaterThanOrEqual(1);

    // Verify active line and active line gutter elements are rendered on line 1
    const activeGutter = parent.querySelector<HTMLElement>(".cm-activeLineGutter");
    expect(activeGutter).not.toBeNull();
    expect(activeGutter?.textContent).toBe("1");

    const activeLine = parent.querySelector<HTMLElement>(".cm-activeLine");
    expect(activeLine).not.toBeNull();

    // Move cursor to line 3
    const line3Pos = view.state.doc.line(3).from;
    view.dispatch({
      selection: { anchor: line3Pos },
    });

    const activeGutterAfterMove = parent.querySelector<HTMLElement>(
      ".cm-activeLineGutter"
    );
    expect(activeGutterAfterMove).not.toBeNull();
    expect(activeGutterAfterMove?.textContent).toBe("3");
  });
});
