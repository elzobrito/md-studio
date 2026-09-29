import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PreviewSubToolbar,
  type PreviewSubMode,
} from "../../src/components/preview/PreviewSubToolbar";
import { PreviewDiffView } from "../../src/components/preview/PreviewDiffView";
import { PreviewHtmlView } from "../../src/components/preview/PreviewHtmlView";
import {
  PreviewSurface,
  loadSavedPreviewZoom,
  savePreviewZoom,
  PREVIEW_ZOOM_STORAGE_KEY,
} from "../../src/components/preview/PreviewSurface";
import { computeLineDiff } from "../../src/services/historyDiff";

describe("Task 053-N: Preview Surface", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Zoom persistence & layout-safe scaling", () => {
    it("loads default zoom level of 1.0 and allows persistence", () => {
      expect(loadSavedPreviewZoom()).toBe(1.0);
      savePreviewZoom(1.25);
      expect(loadSavedPreviewZoom()).toBe(1.25);
      expect(localStorage.getItem(PREVIEW_ZOOM_STORAGE_KEY)).toBe("1.25");
    });
  });

  describe("PreviewSubToolbar Component", () => {
    it("renders dynamic cardinality of submodes without empty slots", () => {
      // 2 submodes (when no saved disk content exists)
      const htmlTwo = renderToStaticMarkup(
        React.createElement(PreviewSubToolbar, {
          currentSubMode: "view",
          availableSubModes: ["view", "html"],
          onChangeSubMode: () => {},
          zoomLevel: 1.0,
          onChangeZoom: () => {},
          isMaximized: false,
        })
      );

      expect(htmlTwo).toContain("Visualização");
      expect(htmlTwo).toContain("HTML gerado");
      expect(htmlTwo).not.toContain("Diff vs salvo");

      // 3 submodes (when saved disk content exists)
      const htmlThree = renderToStaticMarkup(
        React.createElement(PreviewSubToolbar, {
          currentSubMode: "diff",
          availableSubModes: ["view", "html", "diff"],
          onChangeSubMode: () => {},
          zoomLevel: 1.0,
          onChangeZoom: () => {},
          isMaximized: false,
        })
      );

      expect(htmlThree).toContain("Visualização");
      expect(htmlThree).toContain("HTML gerado");
      expect(htmlThree).toContain("Diff vs salvo");
      expect(htmlThree).toContain('aria-checked="true"');
    });

    it("renders zoom indicator and maximize toggle button", () => {
      const html = renderToStaticMarkup(
        React.createElement(PreviewSubToolbar, {
          currentSubMode: "view",
          availableSubModes: ["view", "html"],
          onChangeSubMode: () => {},
          zoomLevel: 1.1,
          onChangeZoom: () => {},
          isMaximized: true,
          onToggleMaximize: () => {},
        })
      );

      expect(html).toContain("110%");
      expect(html).toContain('aria-label="Restaurar tamanho do preview"');
      expect(html).toContain('aria-pressed="true"');
    });
  });

  describe("PreviewDiffView Component (Real LCS Diff)", () => {
    it("shows clean empty state when buffer matches saved content exactly", () => {
      const saved = "# Title\n\nContent paragraph.";
      const current = "# Title\n\nContent paragraph.";

      const html = renderToStaticMarkup(
        React.createElement(PreviewDiffView, {
          savedContent: saved,
          currentContent: current,
          fileName: "doc.md",
        })
      );

      expect(html).toContain("Nenhuma alteração pendente em relação ao arquivo salvo em disco.");
      expect(html).toContain("+0");
      expect(html).toContain("-0");
    });

    it("renders sequence-based LCS diff with hunks, additions and removals without cascades", () => {
      const saved = "Line 1\nLine 2\nLine 3";
      const current = "Line 1\nLine 2 (edited)\nLine 2.5 (inserted)\nLine 3";

      const diff = computeLineDiff(saved, current, 3);
      expect(diff.hasDifferences).toBe(true);
      expect(diff.stats.added).toBe(2);
      expect(diff.stats.removed).toBe(1);

      const html = renderToStaticMarkup(
        React.createElement(PreviewDiffView, {
          savedContent: saved,
          currentContent: current,
          fileName: "doc.md",
        })
      );

      expect(html).toContain("+2");
      expect(html).toContain("-1");
      expect(html).toContain("Line 2 (edited)");
      expect(html).toContain("Line 2.5 (inserted)");
      expect(html).toContain("diff-hunk-box");
    });
  });

  describe("PreviewHtmlView Component", () => {
    it("displays generated HTML structure safely inside code blocks", () => {
      const sampleHtml = "<h1>Hello</h1>\n<p>World</p>";
      const html = renderToStaticMarkup(
        React.createElement(PreviewHtmlView, {
          htmlContent: sampleHtml,
          fileName: "sample.md",
        })
      );

      expect(html).toContain("Estrutura HTML intermediária compilada");
      expect(html).toContain("&lt;h1&gt;Hello&lt;/h1&gt;");
      expect(html).toContain("Copiar HTML");
    });
  });

  describe("PreviewSurface Component", () => {
    it("renders surface with data-zoom and proper region attributes", () => {
      const html = renderToStaticMarkup(
        React.createElement(PreviewSurface, {
          content: "# Title",
          savedContent: "# Title",
          relativePath: "doc.md",
        })
      );

      expect(html).toContain("preview-surface");
      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Superfície de Visualização"');
      expect(html).toContain('data-zoom="1"');
      expect(html).toContain("Visualização");
      expect(html).toContain("Diff vs salvo");
    });
  });
});
