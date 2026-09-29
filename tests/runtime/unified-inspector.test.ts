import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UnifiedInspector } from "../../src/components/inspector/UnifiedInspector";
import type { BacklinkResult, ResolvedWikiLink } from "../../src/types/metadata";

describe("Task 053-O: Unified Inspector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockBacklinks: BacklinkResult = {
    targetPath: "doc.md",
    documentCount: 1,
    occurrenceCount: 1,
    groups: [
      {
        sourcePath: "index.md",
        sourceTitle: "Index",
        occurrences: [
          { sourcePath: "index.md", line: 5, context: "Veja [[doc]] para detalhes." },
        ],
      },
    ],
  };

  const emptyBacklinks: BacklinkResult = {
    targetPath: "doc.md",
    documentCount: 0,
    occurrenceCount: 0,
    groups: [],
  };

  const mockLinks: ResolvedWikiLink[] = [
    {
      target: "guide",
      alias: "Guia Operacional",
      status: "resolved",
      path: "docs/guide.md",
      line: 1,
      candidates: [],
    },
  ];

  it("renders unified inspector with complementary role and accessible accordion headers", () => {
    const html = renderToStaticMarkup(
      React.createElement(UnifiedInspector, {
        content: "# Heading 1\n\n## Subheading",
        activeDocumentPath: "doc.md",
        onNavigateHeading: () => {},
        outgoingLinks: mockLinks,
        onOpenOutgoingLink: async () => {},
        backlinkResult: mockBacklinks,
        onOpenBacklinkOccurrence: async () => {},
        onClose: () => {},
      })
    );

    expect(html).toContain('role="complementary"');
    expect(html).toContain('aria-label="Inspetor do Documento"');
    expect(html).toContain("Sumário");
    expect(html).toContain("Links citados");
    expect(html).toContain("Backlinks");
    expect(html).toContain("Métricas &amp; Estrutura");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="inspector-section-toc"');
  });

  it("derives TOC strictly from AST with zero dependency on Preview DOM", () => {
    // 2 headings
    const htmlTwo = renderToStaticMarkup(
      React.createElement(UnifiedInspector, {
        content: "# Section A\n\n## Section B",
        activeDocumentPath: "doc.md",
        onNavigateHeading: () => {},
        outgoingLinks: [],
        onOpenOutgoingLink: async () => {},
        backlinkResult: emptyBacklinks,
        onOpenBacklinkOccurrence: async () => {},
        onClose: () => {},
      })
    );

    expect(htmlTwo).toContain('<span class="inspector-badge-count">2</span>');
    expect(htmlTwo).toContain("Section A");
    expect(htmlTwo).toContain("Section B");

    // 4 headings
    const htmlFour = renderToStaticMarkup(
      React.createElement(UnifiedInspector, {
        content: "# Section A\n\n## Section B\n\n### Section C\n\n#### Section D",
        activeDocumentPath: "doc.md",
        onNavigateHeading: () => {},
        outgoingLinks: [],
        onOpenOutgoingLink: async () => {},
        backlinkResult: emptyBacklinks,
        onOpenBacklinkOccurrence: async () => {},
        onClose: () => {},
      })
    );

    expect(htmlFour).toContain('<span class="inspector-badge-count">4</span>');
    expect(htmlFour).toContain("Section C");
    expect(htmlFour).toContain("Section D");
  });

  it("displays links and backlinks counts from real semantic providers", () => {
    const html = renderToStaticMarkup(
      React.createElement(UnifiedInspector, {
        content: "# Document",
        activeDocumentPath: "doc.md",
        onNavigateHeading: () => {},
        outgoingLinks: mockLinks,
        onOpenOutgoingLink: async () => {},
        backlinkResult: mockBacklinks,
        onOpenBacklinkOccurrence: async () => {},
        onClose: () => {},
      })
    );

    // 1 outgoing link
    expect(html).toContain('<span class="inspector-badge-count">1</span>');
    expect(html).toContain("Guia Operacional");

    // Backlink group from index.md
    expect(html).toContain("index.md");
    expect(html).toContain("1 ocorrência");
    expect(html).toContain("Linha 5");
  });
});
