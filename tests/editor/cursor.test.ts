import { EditorState } from "@codemirror/state";
import { EditorView, getDrawSelectionConfig } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { editorCursorExtensions } from "../../src/components/MarkdownEditor";

let view: EditorView | null = null;

afterEach(() => {
  view?.destroy();
  view = null;
  document.body.innerHTML = "";
});

describe("editor cursor", () => {
  it("installs a drawn cursor with a 1200ms blink rate", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    view = new EditorView({
      parent,
      state: EditorState.create({ doc: "texto", extensions: editorCursorExtensions }),
    });

    view.focus();
    const layer = parent.querySelector<HTMLElement>(".cm-cursorLayer");

    expect(layer).not.toBeNull();
    expect(layer?.style.animationDuration).toBe("1200ms");
    expect(getDrawSelectionConfig(view.state)?.cursorBlinkRate).toBe(1200);
  });
});
