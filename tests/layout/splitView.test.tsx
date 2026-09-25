import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  SplitDivider,
  loadSavedSplitRatio,
  saveSplitRatio,
  SPLIT_RATIO_STORAGE_KEY,
  DEFAULT_SPLIT_RATIO,
} from "../../src/components/layout/SplitDivider";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof globalThis.PointerEvent === "undefined") {
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: any = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  };
}

describe("MD-UI-011: Split View refinado (SplitDivider)", () => {
  let container: HTMLDivElement;
  let fakeContainerRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockMain = document.createElement("div");
    // Mock getBoundingClientRect: left = 0, width = 1000px
    mockMain.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 600,
      width: 1000,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    fakeContainerRef = { current: mockMain };
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    localStorage.clear();
  });

  describe("Persistence helpers", () => {
    it("returns default ratio 0.5 when nothing is stored or invalid", () => {
      expect(loadSavedSplitRatio()).toBe(DEFAULT_SPLIT_RATIO);

      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, "invalid-nan");
      expect(loadSavedSplitRatio()).toBe(DEFAULT_SPLIT_RATIO);

      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, "-0.5");
      expect(loadSavedSplitRatio()).toBe(DEFAULT_SPLIT_RATIO);

      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, "1.5");
      expect(loadSavedSplitRatio()).toBe(DEFAULT_SPLIT_RATIO);
    });

    it("loads and saves valid ratio correctly", () => {
      saveSplitRatio(0.62);
      expect(loadSavedSplitRatio()).toBe(0.62);

      saveSplitRatio(0.4);
      expect(loadSavedSplitRatio()).toBe(0.4);
    });
  });

  describe("SplitDivider Component", () => {
    it("renders with separator role, ARIA attributes and 50% initial value", async () => {
      const root = createRoot(container);
      const onChangeRatio = vi.fn();

      await act(async () => {
        root.render(
          <SplitDivider
            ratio={0.5}
            onChangeRatio={onChangeRatio}
            containerRef={fakeContainerRef}
          />
        );
      });

      const divider = container.querySelector('[role="separator"]');
      expect(divider).not.toBeNull();
      expect(divider?.getAttribute("aria-orientation")).toBe("vertical");
      expect(divider?.getAttribute("aria-valuenow")).toBe("50");
      expect(divider?.getAttribute("aria-valuemin")).toBe("20");
      expect(divider?.getAttribute("aria-valuemax")).toBe("80");
      expect(divider?.getAttribute("tabindex")).toBe("0");
      expect(divider?.getAttribute("aria-label")).toBe("Divisor da visualização dividida");

      const handle = container.querySelector(".split-divider-handle");
      expect(handle).not.toBeNull();

      act(() => {
        root.unmount();
      });
    });

    it("handles pointer drag and calculates clamped ratio based on container width", async () => {
      const root = createRoot(container);
      const onChangeRatio = vi.fn();

      await act(async () => {
        root.render(
          <SplitDivider
            ratio={0.5}
            onChangeRatio={onChangeRatio}
            containerRef={fakeContainerRef}
          />
        );
      });

      const divider = container.querySelector<HTMLDivElement>(".split-divider")!;
      // Mock pointer capture
      divider.setPointerCapture = vi.fn();
      divider.releasePointerCapture = vi.fn();

      // Pointer down to start drag
      await act(async () => {
        divider.dispatchEvent(
          new PointerEvent("pointerdown", { button: 0, pointerId: 1, bubbles: true })
        );
      });

      expect(divider.classList.contains("is-dragging")).toBe(true);

      // Pointer move to 650px (out of 1000px => 0.65 ratio)
      await act(async () => {
        divider.dispatchEvent(
          new PointerEvent("pointermove", { clientX: 650, pointerId: 1, bubbles: true })
        );
      });

      expect(onChangeRatio).toHaveBeenCalledWith(0.65);

      // Pointer up to finish drag
      await act(async () => {
        divider.dispatchEvent(
          new PointerEvent("pointerup", { pointerId: 1, bubbles: true })
        );
      });

      expect(divider.classList.contains("is-dragging")).toBe(false);

      act(() => {
        root.unmount();
      });
    });

    it("resets to 50/50 on double click", async () => {
      const root = createRoot(container);
      const onReset = vi.fn();
      const onChangeRatio = vi.fn();

      await act(async () => {
        root.render(
          <SplitDivider
            ratio={0.65}
            onChangeRatio={onChangeRatio}
            onReset={onReset}
            containerRef={fakeContainerRef}
          />
        );
      });

      const divider = container.querySelector<HTMLDivElement>(".split-divider")!;

      await act(async () => {
        divider.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      });

      expect(onReset).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(SPLIT_RATIO_STORAGE_KEY)).toBe("0.500");

      act(() => {
        root.unmount();
      });
    });

    it("supports keyboard navigation (ArrowLeft, ArrowRight, Home, End, Enter)", async () => {
      const root = createRoot(container);
      const onChangeRatio = vi.fn();

      await act(async () => {
        root.render(
          <SplitDivider
            ratio={0.5}
            onChangeRatio={onChangeRatio}
            containerRef={fakeContainerRef}
          />
        );
      });

      const divider = container.querySelector<HTMLDivElement>(".split-divider")!;

      // ArrowLeft decreases ratio
      await act(async () => {
        divider.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      });
      expect(onChangeRatio).toHaveBeenCalledWith(0.45);

      // ArrowRight increases ratio
      await act(async () => {
        divider.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });
      expect(onChangeRatio).toHaveBeenCalledWith(0.55);

      // Home sets to min (0.2)
      await act(async () => {
        divider.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
      });
      expect(onChangeRatio).toHaveBeenCalledWith(0.2);

      // End sets to max (0.8)
      await act(async () => {
        divider.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      });
      expect(onChangeRatio).toHaveBeenCalledWith(0.8);

      // Enter resets to default 0.5
      await act(async () => {
        divider.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      });
      expect(onChangeRatio).toHaveBeenCalledWith(0.5);

      act(() => {
        root.unmount();
      });
    });

    it("opens preset menu on handle click and applies chosen preset", async () => {
      const root = createRoot(container);
      const onChangeRatio = vi.fn();

      await act(async () => {
        root.render(
          <SplitDivider
            ratio={0.5}
            onChangeRatio={onChangeRatio}
            containerRef={fakeContainerRef}
          />
        );
      });

      const handle = container.querySelector<HTMLDivElement>(".split-divider-handle")!;

      // Click handle to open menu
      await act(async () => {
        handle.click();
      });

      const menu = container.querySelector('[role="menu"]');
      expect(menu).not.toBeNull();

      const presetBtns = container.querySelectorAll<HTMLButtonElement>(".split-preset-btn");
      expect(presetBtns.length).toBe(3);
      expect(presetBtns[0].textContent).toContain("40 / 60");
      expect(presetBtns[1].textContent).toContain("50 / 50");
      expect(presetBtns[2].textContent).toContain("60 / 40");

      // Click 60 / 40 preset
      await act(async () => {
        presetBtns[2].click();
      });

      expect(onChangeRatio).toHaveBeenCalledWith(0.6);
      expect(localStorage.getItem(SPLIT_RATIO_STORAGE_KEY)).toBe("0.600");
      // Menu should be closed
      expect(container.querySelector('[role="menu"]')).toBeNull();

      act(() => {
        root.unmount();
      });
    });
  });
});
