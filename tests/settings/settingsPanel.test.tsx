import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SettingsPanel, SETTINGS_TABS } from "../../src/components/settings/SettingsPanel";
import { settingsStore } from "../../src/state/settings";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UI-010: Settings refinado (SettingsPanel)", () => {
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

  it("does not render when isOpen is false", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<SettingsPanel isOpen={false} onClose={() => {}} />);
    });

    expect(container.innerHTML).toBe("");
    act(() => {
      root.unmount();
    });
  });

  it("renders modal structure, vector icons, ARIA tablist and canonical tabs when isOpen is true", async () => {
    const root = createRoot(container);
    const onClose = vi.fn();

    await act(async () => {
      root.render(<SettingsPanel isOpen={true} onClose={onClose} />);
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBe("Configurações");

    // Header has vector SVG icon and title
    const headerTitle = container.querySelector(".settings-modal-title");
    expect(headerTitle?.textContent).toContain("Configurações");
    const headerSvg = headerTitle?.querySelector("svg");
    expect(headerSvg).not.toBeNull();

    // Close button has vector icon
    const closeBtn = container.querySelector<HTMLButtonElement>(".settings-modal-close-btn");
    expect(closeBtn).not.toBeNull();
    expect(closeBtn?.getAttribute("aria-label")).toBe("Fechar");
    expect(closeBtn?.querySelector("svg")).not.toBeNull();

    // Tablist
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    expect(tablist?.getAttribute("aria-label")).toBe("Categorias de configuração");

    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs.length).toBe(7);

    const expectedLabels = ["Aparência", "Editor", "Preview", "Workspace", "Atalhos", "Ferramentas", "Sobre"];
    tabs.forEach((tab, i) => {
      expect(tab.textContent).toContain(expectedLabels[i]);
      // Each tab button must render an SVG icon instead of emoji
      const svg = tab.querySelector("svg");
      expect(svg).not.toBeNull();
      // Tab ID and ARIA controls
      expect(tab.id).toBe(`settings-tab-${SETTINGS_TABS[i].id}`);
      expect(tab.getAttribute("aria-controls")).toBe(`settings-tabpanel-${SETTINGS_TABS[i].id}`);
    });

    // Default active tab is appearance
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].classList.contains("active")).toBe(true);

    // Tabpanel
    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel).not.toBeNull();
    expect(tabpanel?.id).toBe("settings-tabpanel-appearance");
    expect(tabpanel?.getAttribute("aria-labelledby")).toBe("settings-tab-appearance");

    // Footer buttons: Restaurar Padrões & Fechar (not Concluído)
    const secondaryBtn = container.querySelector(".settings-btn-secondary");
    expect(secondaryBtn?.textContent).toBe("Restaurar Padrões");

    const primaryBtn = container.querySelector<HTMLButtonElement>(".settings-btn-primary");
    expect(primaryBtn?.textContent).toBe("Fechar");

    act(() => {
      root.unmount();
    });
  });

  it("switches active tab and updates tabpanel when clicking different tabs", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<SettingsPanel isOpen={true} onClose={() => {}} />);
    });

    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const editorTab = tabs[1];
    expect(editorTab.textContent).toContain("Editor");

    await act(async () => {
      editorTab.click();
    });

    expect(editorTab.getAttribute("aria-selected")).toBe("true");
    expect(editorTab.classList.contains("active")).toBe(true);
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");

    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel?.id).toBe("settings-tabpanel-editor");
    expect(tabpanel?.getAttribute("aria-labelledby")).toBe("settings-tab-editor");

    // Click Preview tab
    const previewTab = tabs[2];
    await act(async () => {
      previewTab.click();
    });
    expect(previewTab.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector('[role="tabpanel"]')?.id).toBe("settings-tabpanel-preview");

    act(() => {
      root.unmount();
    });
  });

  it("supports keyboard navigation within tablist (ArrowDown, ArrowUp, Home, End)", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<SettingsPanel isOpen={true} onClose={() => {}} />);
    });

    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const firstTab = tabs[0]; // appearance

    // Press ArrowDown on first tab -> moves to editor
    await act(async () => {
      firstTab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector('[role="tabpanel"]')?.id).toBe("settings-tabpanel-editor");

    // Press ArrowUp on second tab -> moves back to appearance
    await act(async () => {
      tabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");

    // Press End -> moves to last tab (about)
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    });
    expect(tabs[6].getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector('[role="tabpanel"]')?.id).toBe("settings-tabpanel-about");

    // Press Home -> moves to first tab
    await act(async () => {
      tabs[6].dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");

    act(() => {
      root.unmount();
    });
  });

  it("calls onClose when clicking close button, Fechar button, overlay or pressing Escape", async () => {
    const root = createRoot(container);
    const onClose = vi.fn();

    await act(async () => {
      root.render(<SettingsPanel isOpen={true} onClose={onClose} />);
    });

    // 1. Click Close 'X' button
    const closeBtn = container.querySelector<HTMLButtonElement>(".settings-modal-close-btn")!;
    await act(async () => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    // 2. Click 'Fechar' primary button
    const primaryBtn = container.querySelector<HTMLButtonElement>(".settings-btn-primary")!;
    await act(async () => {
      primaryBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(2);

    // 3. Press Escape key
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(3);

    // 4. Click overlay background
    const overlay = container.querySelector<HTMLDivElement>(".settings-modal-overlay")!;
    await act(async () => {
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(4);

    act(() => {
      root.unmount();
    });
  });

  it("calls settingsStore.resetToDefaults when clicking Restaurar Padrões", async () => {
    const root = createRoot(container);
    const resetSpy = vi.spyOn(settingsStore, "resetToDefaults");

    await act(async () => {
      root.render(<SettingsPanel isOpen={true} onClose={() => {}} />);
    });

    const resetBtn = container.querySelector<HTMLButtonElement>(".settings-btn-secondary")!;
    await act(async () => {
      resetBtn.click();
    });

    expect(resetSpy).toHaveBeenCalledTimes(1);
    resetSpy.mockRestore();

    act(() => {
      root.unmount();
    });
  });
});
