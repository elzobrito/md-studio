import { describe, expect, it, vi } from "vitest";
import { editorStore } from "../../src/state/editor";

describe("editorStore", () => {
  it("tracks cursor position updates", () => {
    editorStore.setCursor(15, 8);
    expect(editorStore.getCursor()).toEqual({ line: 15, col: 8 });
  });

  it("tracks save status and error message", () => {
    editorStore.setSaveStatus("saving");
    expect(editorStore.getSaveStatus()).toBe("saving");

    editorStore.setSaveStatus("error", "Disk full");
    expect(editorStore.getSaveStatus()).toBe("error");
    expect(editorStore.getErrorMessage()).toBe("Disk full");

    editorStore.setSaveStatus("saved");
    expect(editorStore.getSaveStatus()).toBe("saved");
    expect(editorStore.getErrorMessage()).toBeUndefined();
  });

  it("tracks totalLines count", () => {
    editorStore.setTotalLines(120);
    expect(editorStore.getTotalLines()).toBe(120);
  });

  it("registers and triggers goToLine handler", () => {
    const handler = vi.fn();
    const unregister = editorStore.registerGoToLine(handler);

    editorStore.goToLine(42);
    expect(handler).toHaveBeenCalledWith(42);

    unregister();
    editorStore.goToLine(99);
    expect(handler).not.toHaveBeenCalledWith(99);
  });

  it("notifies subscribers when changes occur", () => {
    const listener = vi.fn();
    const unsubscribe = editorStore.subscribe(listener);

    editorStore.setCursor(20, 5);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});
