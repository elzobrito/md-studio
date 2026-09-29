import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveStatusBadge } from "../../src/components/statusbar/SaveStatus";
import { StatusBar } from "../../src/components/statusbar/StatusBar";
import type { SaveStatus } from "../../src/state/editor";

describe("Task 053-P: Status & Persistence Feedback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("SaveStatusBadge Component (All Normative States)", () => {
    const states: Array<{
      status: SaveStatus;
      expectedLabel: string;
      expectedClass: string;
    }> = [
      { status: "saved", expectedLabel: "Salvo", expectedClass: "status-saved" },
      { status: "modified", expectedLabel: "Modificado", expectedClass: "status-modified" },
      { status: "saving", expectedLabel: "Salvando...", expectedClass: "status-saving" },
      { status: "unsaved", expectedLabel: "Não salvo", expectedClass: "status-unsaved" },
      { status: "conflicted", expectedLabel: "Conflito de disco", expectedClass: "status-conflicted" },
      { status: "missing", expectedLabel: "Arquivo ausente", expectedClass: "status-missing" },
      { status: "error", expectedLabel: "Erro ao salvar", expectedClass: "status-error" },
    ];

    states.forEach(({ status, expectedLabel, expectedClass }) => {
      it(`renders state "${status}" with label "${expectedLabel}" and class "${expectedClass}"`, () => {
        const html = renderToStaticMarkup(
          React.createElement(SaveStatusBadge, {
            status,
            fileName: "test.md",
          })
        );

        expect(html).toContain(expectedLabel);
        expect(html).toContain(expectedClass);
        expect(html).toContain('role="status"');
        expect(html).toContain('aria-live="polite"');
        expect(html).toContain(`aria-label="${expectedLabel}"`);
      });
    });

    it("displays error message in tooltip when status is error", () => {
      const html = renderToStaticMarkup(
        React.createElement(SaveStatusBadge, {
          status: "error",
          errorMessage: "Disco cheio ou sem permissão",
          fileName: "test.md",
        })
      );

      expect(html).toContain('title="Disco cheio ou sem permissão"');
    });
  });

  describe("StatusBar Component", () => {
    it("renders editorial counters, encoding, line ending and persistence badge", () => {
      const markdown = "# Title\nLine 2\nLine 3\nWord four five.";
      const html = renderToStaticMarkup(
        React.createElement(StatusBar, {
          viewMode: "source",
          content: markdown,
          encoding: "UTF-8",
          lineEnding: "LF",
          saveStatus: "saved",
          fileName: "doc.md",
        })
      );

      expect(html).toContain("Markdown");
      expect(html).toContain("4 linhas");
      expect(html).toContain("UTF-8");
      expect(html).toContain("LF");
      expect(html).toContain("Salvo");
      // Not in split mode, so sync scroll must not be rendered
      expect(html).not.toContain("⇄ Sync");
    });

    it("renders sync scroll indicator only when in split view mode", () => {
      const onToggle = vi.fn();
      const html = renderToStaticMarkup(
        React.createElement(StatusBar, {
          viewMode: "split",
          content: "Hello",
          syncScroll: true,
          onToggleSyncScroll: onToggle,
          saveStatus: "modified",
        })
      );

      expect(html).toContain("Dividida");
      expect(html).toContain("⇄ Sync ON");
      expect(html).toContain("Modificado");
    });
  });
});
