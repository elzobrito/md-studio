import { describe, expect, it, beforeEach } from "vitest";
import { settingsStore, DEFAULT_SETTINGS } from "../../src/state/settings";

describe("settingsStore", () => {
  beforeEach(() => {
    settingsStore.resetToDefaults();
  });

  it("modifies font size with limits", () => {
    settingsStore.setFontSize(18);
    expect(settingsStore.getState().fontSize).toBe(18);

    // Below minimum
    settingsStore.setFontSize(5);
    expect(settingsStore.getState().fontSize).toBe(10);

    // Above maximum
    settingsStore.setFontSize(40);
    expect(settingsStore.getState().fontSize).toBe(28);
  });

  it("handles zoom controls", () => {
    expect(settingsStore.getState().zoom).toBe(100);

    settingsStore.zoomIn();
    expect(settingsStore.getState().zoom).toBe(110);

    settingsStore.zoomOut();
    expect(settingsStore.getState().zoom).toBe(100);

    settingsStore.setZoom(130);
    expect(settingsStore.getState().zoom).toBe(130);

    settingsStore.resetZoom();
    expect(settingsStore.getState().zoom).toBe(100);
  });

  it("switches themes", () => {
    settingsStore.setTheme("light");
    expect(settingsStore.getState().theme).toBe("light");

    settingsStore.setTheme("dark");
    expect(settingsStore.getState().theme).toBe("dark");

    settingsStore.setTheme("auto");
    expect(settingsStore.getState().theme).toBe("auto");
  });

  it("manages preview typography and editor behaviors", () => {
    settingsStore.setPreviewFontSize(20);
    expect(settingsStore.getState().previewFontSize).toBe(20);

    // Clamped
    settingsStore.setPreviewFontSize(50);
    expect(settingsStore.getState().previewFontSize).toBe(32);

    settingsStore.setPreviewFontFamily("Georgia, serif");
    expect(settingsStore.getState().previewFontFamily).toBe("Georgia, serif");

    settingsStore.setLineWrapping(false);
    expect(settingsStore.getState().lineWrapping).toBe(false);

    settingsStore.setLineNumbers(false);
    expect(settingsStore.getState().lineNumbers).toBe(false);

    // Auto-save toggle and delay clamping
    expect(settingsStore.getState().autoSave).toBe(true);
    settingsStore.setAutoSave(false);
    expect(settingsStore.getState().autoSave).toBe(false);

    settingsStore.setAutoSaveDelay(2500);
    expect(settingsStore.getState().autoSaveDelay).toBe(2500);

    // Clamped below minimum (500ms)
    settingsStore.setAutoSaveDelay(100);
    expect(settingsStore.getState().autoSaveDelay).toBe(500);

    // Clamped above maximum (10000ms)
    settingsStore.setAutoSaveDelay(20000);
    expect(settingsStore.getState().autoSaveDelay).toBe(10000);
  });

  it("resets all settings to defaults", () => {
    settingsStore.setFontSize(22);
    settingsStore.setZoom(140);
    settingsStore.setTheme("light");
    settingsStore.setPreviewFontSize(24);
    settingsStore.setLineWrapping(false);
    settingsStore.setAutoSave(false);
    settingsStore.setAutoSaveDelay(3000);

    settingsStore.resetToDefaults();
    expect(settingsStore.getState().fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(settingsStore.getState().zoom).toBe(DEFAULT_SETTINGS.zoom);
    expect(settingsStore.getState().theme).toBe(DEFAULT_SETTINGS.theme);
    expect(settingsStore.getState().previewFontSize).toBe(DEFAULT_SETTINGS.previewFontSize);
    expect(settingsStore.getState().lineWrapping).toBe(DEFAULT_SETTINGS.lineWrapping);
    expect(settingsStore.getState().autoSave).toBe(DEFAULT_SETTINGS.autoSave);
    expect(settingsStore.getState().autoSaveDelay).toBe(DEFAULT_SETTINGS.autoSaveDelay);
  });
});
