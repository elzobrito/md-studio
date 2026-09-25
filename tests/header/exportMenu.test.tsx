import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ExportMenu } from "../../src/components/header/ExportMenu";
import { AppHeader } from "../../src/components/header/AppHeader";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UI-004: Unified Export Menu", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("renders a single [ Exportar ▾ ] trigger button with accessible attributes", async () => {
    const root = createRoot(container);
    const onExportHtml = vi.fn();
    const onExportPdf = vi.fn();

    await act(async () => {
      root.render(
        <ExportMenu
          disabled={false}
          onExportHtml={onExportHtml}
          onExportPdf={onExportPdf}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger");
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain("Exportar");
    expect(trigger?.textContent).toContain("▾");
    expect(trigger?.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.disabled).toBe(false);

    // Menu list is hidden by default
    const menu = container.querySelector<HTMLUListElement>(".export-dropdown-menu");
    expect(menu).not.toBeNull();
    expect(menu?.hidden).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it("opens dropdown on click, shows formats and closes after selecting an item", async () => {
    const root = createRoot(container);
    const onExportHtml = vi.fn();
    const onExportPdf = vi.fn();

    await act(async () => {
      root.render(
        <ExportMenu
          disabled={false}
          onExportHtml={onExportHtml}
          onExportPdf={onExportPdf}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger")!;

    // Open menu
    await act(async () => {
      trigger.click();
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const menu = container.querySelector<HTMLUListElement>(".export-dropdown-menu")!;
    expect(menu.hidden).toBe(false);

    const items = container.querySelectorAll<HTMLButtonElement>(".export-menu-item");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain("Exportar HTML");
    expect(items[1].textContent).toContain("Exportar PDF");

    // Click HTML item
    await act(async () => {
      items[0].click();
    });

    expect(onExportHtml).toHaveBeenCalledTimes(1);
    expect(onExportPdf).not.toHaveBeenCalled();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(menu.hidden).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it("supports keyboard navigation: open with ArrowDown and close with Escape", async () => {
    const root = createRoot(container);
    const onExportHtml = vi.fn();

    await act(async () => {
      root.render(
        <ExportMenu
          disabled={false}
          onExportHtml={onExportHtml}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger")!;

    // Open via ArrowDown
    await act(async () => {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const item = container.querySelector<HTMLButtonElement>(".export-menu-item")!;
    // Close via Escape on item
    await act(async () => {
      item.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("closes on click outside", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ExportMenu
          disabled={false}
          onExportHtml={() => {}}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger")!;

    await act(async () => {
      trigger.click();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    // Click outside
    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("is disabled when disabled prop is true", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ExportMenu
          disabled={true}
          onExportHtml={() => {}}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger")!;
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute("title")).toBe("Nenhum documento aberto para exportar");

    await act(async () => {
      trigger.click();
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("integrates seamlessly into AppHeader", async () => {
    const root = createRoot(container);
    const onExportHtml = vi.fn();
    const onExportPdf = vi.fn();

    await act(async () => {
      root.render(
        <AppHeader
          viewMode="source"
          onViewModeChange={() => {}}
          leftOpen={true}
          rightOpen={true}
          onToggleLeft={() => {}}
          onToggleRight={() => {}}
          onSave={() => {}}
          canSave={true}
          canExport={true}
          onExportHtml={onExportHtml}
          onExportPdf={onExportPdf}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger");
    expect(trigger).not.toBeNull();
    expect(trigger?.disabled).toBe(false);

    // Only one single export trigger in header chrome
    const allTriggers = container.querySelectorAll(".export-menu-trigger");
    expect(allTriggers.length).toBe(1);

    act(() => {
      root.unmount();
    });
  });

  it("renders Exportar EPUB option and calls onExportEpub when clicked", async () => {
    const root = createRoot(container);
    const onExportHtml = vi.fn();
    const onExportPdf = vi.fn();
    const onExportEpub = vi.fn();

    await act(async () => {
      root.render(
        <ExportMenu
          disabled={false}
          onExportHtml={onExportHtml}
          onExportPdf={onExportPdf}
          onExportEpub={onExportEpub}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger")!;

    await act(async () => {
      trigger.click();
    });

    const items = container.querySelectorAll<HTMLButtonElement>(".export-menu-item");
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain("Exportar HTML");
    expect(items[1].textContent).toContain("Exportar PDF");
    expect(items[2].textContent).toContain("Exportar EPUB");

    await act(async () => {
      items[2].click();
    });

    expect(onExportEpub).toHaveBeenCalledTimes(1);
    expect(onExportHtml).not.toHaveBeenCalled();
    expect(onExportPdf).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it("integrates onExportEpub into AppHeader", async () => {
    const root = createRoot(container);
    const onExportEpub = vi.fn();

    await act(async () => {
      root.render(
        <AppHeader
          viewMode="source"
          onViewModeChange={() => {}}
          leftOpen={true}
          rightOpen={true}
          onToggleLeft={() => {}}
          onToggleRight={() => {}}
          onSave={() => {}}
          canSave={true}
          canExport={true}
          onExportEpub={onExportEpub}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(".export-menu-trigger");
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.click();
    });

    const epubBtn = container.querySelector<HTMLButtonElement>(".export-epub-btn");
    expect(epubBtn).not.toBeNull();
    expect(epubBtn?.textContent).toContain("Exportar EPUB");

    act(() => {
      root.unmount();
    });
  });
});
