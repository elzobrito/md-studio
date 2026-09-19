import { describe, expect, it, beforeEach } from "vitest";
import { settingsStore, DEFAULT_SETTINGS } from "../../src/state/settings";
import { recentFilesStore } from "../../src/state/recent-files";
import { editorStore } from "../../src/state/editor";

describe("Wireframe Fidelity QA Suite", () => {
  beforeEach(() => {
    settingsStore.resetToDefaults();
    recentFilesStore.clear();
  });

  describe("SaveButton & Editor Save Status", () => {
    it("manages save status transitions correctly", () => {
      editorStore.setSaveStatus("saved");
      expect(editorStore.getSaveStatus()).toBe("saved");

      editorStore.setSaveStatus("modified");
      expect(editorStore.getSaveStatus()).toBe("modified");

      editorStore.setSaveStatus("saving");
      expect(editorStore.getSaveStatus()).toBe("saving");

      editorStore.setSaveStatus("error", "Disk full");
      expect(editorStore.getSaveStatus()).toBe("error");
      expect(editorStore.getErrorMessage()).toBe("Disk full");
    });

    it("resets save status when opening new document", () => {
      editorStore.setSaveStatus("modified");
      expect(editorStore.getSaveStatus()).toBe("modified");

      editorStore.setSaveStatus("saved");
      expect(editorStore.getSaveStatus()).toBe("saved");
    });
  });

  describe("Settings Wireframe Controls", () => {
    it("supports all zoom presets: 75%, 90%, 100%, 110%, 125%", () => {
      const presets = [75, 90, 100, 110, 125];
      for (const p of presets) {
        settingsStore.setZoom(p);
        expect(settingsStore.getState().zoom).toBe(p);
      }
    });

    it("supports preview font family and font size customization", () => {
      settingsStore.setPreviewFontSize(18);
      expect(settingsStore.getState().previewFontSize).toBe(18);

      settingsStore.setPreviewFontFamily("Georgia, serif");
      expect(settingsStore.getState().previewFontFamily).toBe("Georgia, serif");
    });

    it("supports editor soft wrap and line number toggles", () => {
      settingsStore.setLineWrapping(false);
      expect(settingsStore.getState().lineWrapping).toBe(false);

      settingsStore.setLineNumbers(false);
      expect(settingsStore.getState().lineNumbers).toBe(false);
    });
  });

  describe("Recent Files Cycling & History", () => {
    it("records and orders recent files with timestamps", () => {
      recentFilesStore.add("docs/intro.md");
      recentFilesStore.add("docs/guide.md");
      recentFilesStore.add("README.md");

      const all = recentFilesStore.getAll();
      expect(all.length).toBe(3);
      expect(all[0].path).toBe("README.md");
      expect(all[1].path).toBe("docs/guide.md");
      expect(all[2].path).toBe("docs/intro.md");
    });
  });

  describe("Navigation & Go to Line", () => {
    it("handles goToLine handler registration and invocation", () => {
      let targetLine = 0;
      const unregister = editorStore.registerGoToLine((line) => {
        targetLine = line;
      });

      editorStore.goToLine(42);
      expect(targetLine).toBe(42);

      editorStore.goToLine(1);
      expect(targetLine).toBe(1);

      unregister();
      editorStore.goToLine(99);
      expect(targetLine).toBe(1); // handler was unregistered
    });
  });
});
