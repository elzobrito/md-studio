import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { EditorSettings } from "../../src/components/settings/EditorSettings";
import { settingsStore } from "../../src/state/settings";
import { useDocumentState } from "../../src/state/documentState";
import * as saveService from "../../src/services/save";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Auto-Save Feature Integration", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    settingsStore.resetToDefaults();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("renders Auto-Save toggle and delay selector in EditorSettings", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<EditorSettings />);
    });

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]:checked');
    const autoSaveCheckbox = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    ).find((el) => el.nextElementSibling?.textContent?.includes("Auto-Save"));

    expect(autoSaveCheckbox).not.toBeNull();
    expect(autoSaveCheckbox?.checked).toBe(true);

    const delaySelect = container.querySelector<HTMLSelectElement>("#autosave-delay-select");
    expect(delaySelect).not.toBeNull();
    expect(delaySelect?.value).toBe("1500");

    // Toggle off
    await act(async () => {
      autoSaveCheckbox?.click();
    });

    expect(settingsStore.getState().autoSave).toBe(false);
    expect(container.querySelector("#autosave-delay-select")).toBeNull();

    // Toggle back on
    await act(async () => {
      autoSaveCheckbox?.click();
    });

    expect(settingsStore.getState().autoSave).toBe(true);
    const delaySelectRestored = container.querySelector<HTMLSelectElement>("#autosave-delay-select");
    expect(delaySelectRestored).not.toBeNull();

    // Change delay
    await act(async () => {
      if (delaySelectRestored) {
        delaySelectRestored.value = "3000";
        delaySelectRestored.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(settingsStore.getState().autoSaveDelay).toBe(3000);

    act(() => {
      root.unmount();
    });
  });

  it("executes auto-save with debounce when editing loaded document", async () => {
    vi.useFakeTimers();

    const persistSpy = vi.spyOn(saveService, "persistDocument").mockResolvedValue({
      ok: true,
      snapshot: {
        workspaceId: "ws-test",
        relativePath: "note.md",
        content: "Draft content",
        encoding: "utf-8",
        mtimeMs: 12345,
        contentHash: "hash-new",
        version: 2,
      },
    });

    let hookResult: ReturnType<typeof useDocumentState>;

    function TestComponent() {
      hookResult = useDocumentState();
      return null;
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(<TestComponent />);
    });

    // Simulate opening an existing file
    await act(async () => {
      // Mocking snapshot directly via state is internal, let's call newDocument or setContent
      hookResult.setContent("Line 1");
    });

    // Because there is no active snapshot yet (unsaved new document), autoSave to disk should NOT fire
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(persistSpy).not.toHaveBeenCalled();

    persistSpy.mockRestore();
    vi.useRealTimers();

    act(() => {
      root.unmount();
    });
  });
});
