import { describe, expect, it, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  settingsStore,
  PREVIEW_READING_WIDTH_OPTIONS,
  type PreviewReadingWidth,
} from "../../src/state/settings";
import { PreviewSettings } from "../../src/components/settings/PreviewSettings";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UI-005: Preview Controlled Reading Width", () => {
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

  it("defaults to comfortable preset (920px) on root CSS property and sets data-reading-width", () => {
    expect(settingsStore.getState().previewReadingWidth).toBe("comfortable");
    const docEl = document.documentElement;
    expect(docEl.style.getPropertyValue("--preview-reading-width")).toBe("920px");
    expect(docEl.getAttribute("data-reading-width")).toBe("comfortable");
  });

  it("updates CSS custom property and data attribute when changing presets", () => {
    const docEl = document.documentElement;

    settingsStore.setPreviewReadingWidth("narrow");
    expect(settingsStore.getState().previewReadingWidth).toBe("narrow");
    expect(docEl.style.getPropertyValue("--preview-reading-width")).toBe("760px");
    expect(docEl.getAttribute("data-reading-width")).toBe("narrow");

    settingsStore.setPreviewReadingWidth("wide");
    expect(settingsStore.getState().previewReadingWidth).toBe("wide");
    expect(docEl.style.getPropertyValue("--preview-reading-width")).toBe("1100px");
    expect(docEl.getAttribute("data-reading-width")).toBe("wide");

    settingsStore.setPreviewReadingWidth("full");
    expect(settingsStore.getState().previewReadingWidth).toBe("full");
    expect(docEl.style.getPropertyValue("--preview-reading-width")).toBe("none");
    expect(docEl.getAttribute("data-reading-width")).toBe("full");

    settingsStore.setPreviewReadingWidth("comfortable");
    expect(settingsStore.getState().previewReadingWidth).toBe("comfortable");
    expect(docEl.style.getPropertyValue("--preview-reading-width")).toBe("920px");
    expect(docEl.getAttribute("data-reading-width")).toBe("comfortable");
  });

  it("falls back safely to comfortable when an invalid preset is provided", () => {
    settingsStore.setPreviewReadingWidth("invalid" as unknown as PreviewReadingWidth);
    expect(settingsStore.getState().previewReadingWidth).toBe("comfortable");
    expect(document.documentElement.style.getPropertyValue("--preview-reading-width")).toBe("920px");
    expect(document.documentElement.getAttribute("data-reading-width")).toBe("comfortable");
  });

  it("keeps data-reading-width in sync after resetToDefaults", () => {
    settingsStore.setPreviewReadingWidth("narrow");
    expect(document.documentElement.getAttribute("data-reading-width")).toBe("narrow");
    settingsStore.resetToDefaults();
    expect(document.documentElement.getAttribute("data-reading-width")).toBe("comfortable");
  });

  it("renders the 4 presets in PreviewSettings UI and updates settings on change", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<PreviewSettings />);
    });

    const select = container.querySelector<HTMLSelectElement>("#preview-reading-width-select");
    expect(select).not.toBeNull();
    expect(select?.value).toBe("comfortable");

    const options = Array.from(select?.options || []);
    expect(options.length).toBe(4);
    expect(options.map((o) => o.value)).toEqual(["narrow", "comfortable", "wide", "full"]);

    // Change to narrow
    await act(async () => {
      if (select) {
        select.value = "narrow";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(settingsStore.getState().previewReadingWidth).toBe("narrow");
    expect(document.documentElement.style.getPropertyValue("--preview-reading-width")).toBe("760px");

    act(() => {
      root.unmount();
    });
  });

  it("has complete preset options definition matching spec", () => {
    expect(PREVIEW_READING_WIDTH_OPTIONS).toHaveLength(4);
    const keys = PREVIEW_READING_WIDTH_OPTIONS.map((o) => o.value);
    expect(keys).toContain("narrow");
    expect(keys).toContain("comfortable");
    expect(keys).toContain("wide");
    expect(keys).toContain("full");
  });
});
