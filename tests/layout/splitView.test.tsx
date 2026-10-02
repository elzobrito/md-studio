import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
      expect(Number(divider?.getAttribute("aria-valuemin"))).toBeLessThanOrEqual(20);
      expect(Number(divider?.getAttribute("aria-valuemax"))).toBeGreaterThanOrEqual(80);
      expect(divider?.getAttribute("tabindex")).toBe("0");
      expect(divider?.getAttribute("aria-label")).toContain("Divisor da visualização dividida");

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

describe("bounded document center layout", () => {
  it("caps stacked sidebars in the same breakpoint that stacks the workspace", () => {
    const themesCss = readFileSync(resolve(process.cwd(), "src/styles/themes.css"), "utf8");
    const responsiveStart = themesCss.indexOf("@media (max-width: 960px)");
    const reducedMotionStart = themesCss.indexOf("@media (prefers-reduced-motion", responsiveStart);
    const responsiveRules = themesCss.slice(responsiveStart, reducedMotionStart);

    expect(responsiveStart).toBeGreaterThanOrEqual(0);
    expect(responsiveRules).toContain("grid-template-rows: auto 1fr auto");
    expect(responsiveRules).toContain(".panel.left");
    expect(responsiveRules).toContain("max-height: 28vh");
    expect(themesCss).not.toContain("@media (max-width: 900px)");
  });

  it("keeps a long split document inside its panes without growing the app chrome", () => {
    const styles = document.createElement("style");
    styles.textContent = ["design-tokens.css", "app-shell.css", "document-tabs.css", "split-view.css", "themes.css"]
      .map((file) => readFileSync(resolve(process.cwd(), "src/styles", file), "utf8"))
      .join("\n")
      .replace(/^\s*@import[^;]+;\s*$/gm, "");
    document.head.append(styles);

    const shell = document.createElement("div");
    shell.className = "app-shell";

    const header = document.createElement("header");
    header.className = "global-appbar";
    const workspace = document.createElement("div");
    workspace.className = "workspace";
    const center = document.createElement("main");
    center.className = "center mode-split";
    const documentBar = document.createElement("div");
    documentBar.className = "document-bar";

    const split = document.createElement("div");
    split.className = "split-layout is-vertical";
    const editorPane = document.createElement("div");
    editorPane.className = "split-layout-pane first";
    const editor = document.createElement("section");
    editor.className = "editor";
    const editorHost = document.createElement("div");
    editorHost.className = "editor-host";
    editorHost.textContent = Array.from({ length: 400 }, (_, i) => `line ${i + 1}`).join("\n");
    editor.append(editorHost);
    editorPane.append(editor);

    const divider = document.createElement("div");
    divider.className = "split-divider is-vertical";
    const previewPane = document.createElement("div");
    previewPane.className = "split-layout-pane second";
    const preview = document.createElement("section");
    preview.className = "preview";
    const previewBody = document.createElement("div");
    previewBody.className = "preview-body";
    previewBody.textContent = Array.from({ length: 400 }, (_, i) => `paragraph ${i + 1}`).join(" ");
    preview.append(previewBody);
    previewPane.append(preview);
    split.append(editorPane, divider, previewPane);
    center.append(documentBar, split);
    workspace.append(center);

    const statusbar = document.createElement("footer");
    statusbar.className = "app-statusbar-container";
    shell.append(header, workspace, statusbar);
    document.body.append(shell);

    try {
      expect(center.children[0]).toBe(documentBar);
      expect(center.children[1]).toBe(split);
      expect(getComputedStyle(center).display).toBe("flex");
      expect(getComputedStyle(center).flexDirection).toBe("column");
      expect(getComputedStyle(center).overflow).toBe("hidden");
      expect(getComputedStyle(documentBar).flexShrink).toBe("0");
      expect(getComputedStyle(workspace).minHeight).toBe("0");
      expect(getComputedStyle(split).flexGrow).toBe("1");
      expect(getComputedStyle(split).minHeight).toBe("0");
      expect(getComputedStyle(editorHost).overflow).toBe("hidden");
      expect(getComputedStyle(previewBody).overflow).toBe("auto");
      expect(getComputedStyle(header).flexShrink).toBe("0");
      expect(getComputedStyle(statusbar).flexShrink).toBe("0");
    } finally {
      shell.remove();
      styles.remove();
    }
  });
});
