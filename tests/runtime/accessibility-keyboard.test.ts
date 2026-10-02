import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as fs from "fs";
import * as path from "path";
import { AppShell } from "../../src/components/shell/AppShell";
import { DocumentBar } from "../../src/components/tabs/DocumentBar";
import { StatusBar } from "../../src/components/statusbar/StatusBar";
import { SettingsPanel } from "../../src/components/settings/SettingsPanel";
import { ToastProvider } from "../../src/components/toast/ToastContext";

describe("Task 053-R: Keyboard & Accessibility (WAI-ARIA)", () => {
  describe("Design Tokens & CSS Invariants", () => {
    const cssPath = path.resolve(__dirname, "../../src/styles/design-tokens.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    it("enforces INV-FOCUS-VISIBLE high-contrast focus rings for interactive elements", () => {
      expect(cssContent).toContain(":focus-visible");
      expect(cssContent).toContain("outline: 2px solid");
      expect(cssContent).toContain('[role="tab"]:focus-visible');
      expect(cssContent).toContain('[role="treeitem"]:focus-visible');
      expect(cssContent).toContain('[role="button"]:focus-visible');
    });

    it("enforces INV-REDUCED-MOTION with @media (prefers-reduced-motion: reduce)", () => {
      expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
      expect(cssContent).toContain("animation-duration: 0.01ms !important");
      expect(cssContent).toContain("transition-duration: 0.01ms !important");
      expect(cssContent).toContain("scroll-behavior: auto !important");
    });
  });

  describe("Component ARIA Semantics & Roles", () => {
    it("renders GlobalAppShell with application landmark role and accessible label", () => {
      const html = renderToStaticMarkup(
        React.createElement(AppShell, {
          theme: "dark",
          appBar: React.createElement("header", null, "AppBar"),
          sidebar: React.createElement("aside", null, "Sidebar"),
          centerSurface: React.createElement("div", null, "Inner Content"),
          inspector: React.createElement("aside", null, "Inspector"),
          statusBar: React.createElement("footer", null, "StatusBar"),
        })
      );

      expect(html).toContain('role="application"');
      expect(html).toContain('aria-label="MD Studio"');
    });

    it("renders DocumentBar with accessible tablist, tab role and aria-selected state", () => {
      const html = renderToStaticMarkup(
        React.createElement(DocumentBar, {
          tabs: [
            {
              documentId: "doc-1",
              canonicalPath: "doc-1.md",
              displayName: "Document 1",
              dirty: false,
              saveStatus: "saved",
              active: true,
            },
            {
              documentId: "doc-2",
              canonicalPath: "doc-2.md",
              displayName: "Document 2",
              dirty: true,
              saveStatus: "modified",
              active: false,
            },
          ],
          activeDocumentId: "doc-1",
          onSelectTab: () => {},
          onCloseTab: () => {},
          viewMode: "source",
        })
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('aria-selected="false"');
      expect(html).not.toContain('aria-label="Modo de visualização"');
      expect(html).not.toContain('aria-label="Salvar"');
      expect(html).not.toContain('aria-label="Exportar"');
    });

    it("renders StatusBar with accessible region or status landmarks", () => {
      const html = renderToStaticMarkup(
        React.createElement(StatusBar, {
          viewMode: "source",
          content: "Sample text with words",
          saveStatus: "saved",
          fileName: "test.md",
        })
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Barra de status"');
    });

    it("renders SettingsPanel with modal dialog semantics", () => {
      const html = renderToStaticMarkup(
        React.createElement(SettingsPanel, {
          isOpen: true,
          onClose: () => {},
        })
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="settings-dialog-title"');
    });

    it("renders ToastProvider with accessible polite live region", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ToastProvider,
          null,
          React.createElement("div", null, "Content")
        )
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-atomic="true"');
    });
  });
});
