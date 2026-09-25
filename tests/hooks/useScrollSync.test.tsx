import React, { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useScrollSync } from "../../src/hooks/useScrollSync";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("useScrollSync", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    container?.remove();
    container = null;
  });

  it("syncs both ways only while enabled and follows later preference changes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const editor = document.createElement("div");
    const preview = document.createElement("div");
    Object.defineProperties(editor, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 100 },
    });
    Object.defineProperties(preview, {
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 100 },
    });
    let renderedState = "";

    function Probe({ enabled }: { enabled: boolean }) {
      const sync = useScrollSync({ enabled });
      useEffect(() => {
        sync.setEditorScroller(editor);
        sync.setPreviewScroller(preview);
      }, [sync.setEditorScroller, sync.setPreviewScroller]);
      renderedState = sync.syncEnabled ? "on" : "off";
      return <span>{renderedState}</span>;
    }

    await act(async () => root!.render(<Probe enabled={true} />));
    expect(renderedState).toBe("on");

    editor.scrollTop = 100;
    await act(async () => editor.dispatchEvent(new Event("scroll")));
    expect(preview.scrollTop).toBe(200);

    preview.scrollTop = 100;
    await new Promise((resolve) => setTimeout(resolve, 60));
    await act(async () => preview.dispatchEvent(new Event("scroll")));
    expect(editor.scrollTop).toBe(50);

    await act(async () => root!.render(<Probe enabled={false} />));
    expect(renderedState).toBe("off");
    preview.scrollTop = 0;
    editor.scrollTop = 150;
    await act(async () => editor.dispatchEvent(new Event("scroll")));
    expect(preview.scrollTop).toBe(0);

    await act(async () => root!.render(<Probe enabled={true} />));
    expect(renderedState).toBe("on");
    editor.scrollTop = 50;
    await act(async () => editor.dispatchEvent(new Event("scroll")));
    expect(preview.scrollTop).toBe(100);
  });
});
