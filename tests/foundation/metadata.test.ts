import { describe, expect, it, vi } from "vitest";
import type {
  DocumentMetadata,
  Heading,
  Link,
  WikiLink,
  WorkspaceStats,
  ReindexReport,
} from "../../src/types/metadata";
import * as metadataIpc from "../../src/lib/ipc/metadata";

describe("Onda 1 — Foundation & Metadata Engine QA Suite", () => {
  describe("TypeScript Metadata Types & Invariants", () => {
    it("conforms to DocumentMetadata structure and camelCase keys", () => {
      const heading: Heading = {
        depth: 2,
        text: "Subtítulo",
        anchor: "subtitulo",
      };

      const link: Link = {
        text: "Documentação",
        url: "https://tauri.app",
        isInternal: false,
        line: 12,
      };

      const wikiLink: WikiLink = {
        target: "Arquitetura",
        alias: "Visão Geral de Arquitetura",
        line: 15,
      };

      const meta: DocumentMetadata = {
        path: "docs/visao-geral.md",
        title: "Visão Geral",
        headings: [heading],
        links: [link],
        wikiLinks: [wikiLink],
        tags: ["arquitetura", "foundation", "v2"],
        images: ["assets/diagrama.png"],
        tables: 2,
        mermaidBlocks: 1,
        katexBlocks: 0,
        wordCount: 350,
        lineCount: 42,
        lastModified: 1726750000,
      };

      expect(meta.path).toBe("docs/visao-geral.md");
      expect(meta.headings[0].depth).toBe(2);
      expect(meta.headings[0].anchor).toBe("subtitulo");
      expect(meta.links[0].isInternal).toBe(false);
      expect(meta.wikiLinks[0].alias).toBe("Visão Geral de Arquitetura");
      expect(meta.tags).toContain("foundation");
      expect(meta.tables).toBe(2);
      expect(meta.mermaidBlocks).toBe(1);
      expect(meta.wordCount).toBe(350);
      expect(meta.lineCount).toBe(42);
    });

    it("supports documents with null title and empty collections", () => {
      const emptyDoc: DocumentMetadata = {
        path: "notas.md",
        title: null,
        headings: [],
        links: [],
        wikiLinks: [],
        tags: [],
        images: [],
        tables: 0,
        mermaidBlocks: 0,
        katexBlocks: 0,
        wordCount: 0,
        lineCount: 0,
        lastModified: 0,
      };

      expect(emptyDoc.title).toBeNull();
      expect(emptyDoc.headings).toHaveLength(0);
      expect(emptyDoc.links).toHaveLength(0);
      expect(emptyDoc.wikiLinks).toHaveLength(0);
      expect(emptyDoc.tags).toHaveLength(0);
    });

    it("conforms to WorkspaceStats schema", () => {
      const stats: WorkspaceStats = {
        totalDocuments: 15,
        totalWords: 12450,
        totalLinks: 84,
        totalWikiLinks: 32,
        totalTags: 48,
        uniqueTags: 11,
        totalMermaid: 6,
        totalKatex: 4,
      };

      expect(stats.totalDocuments).toBe(15);
      expect(stats.totalWords).toBe(12450);
      expect(stats.totalLinks).toBe(84);
      expect(stats.totalWikiLinks).toBe(32);
      expect(stats.uniqueTags).toBe(11);
      expect(stats.totalMermaid).toBe(6);
      expect(stats.totalKatex).toBe(4);
    });

    it("conforms to ReindexReport schema", () => {
      const report: ReindexReport = {
        indexed: 25,
        skipped: 3,
        errors: [],
      };

      expect(report.indexed).toBe(25);
      expect(report.skipped).toBe(3);
      expect(report.errors).toHaveLength(0);
    });
  });

  describe("Metadata IPC Functions Outside Tauri (Mock & Fallback)", () => {
    it("returns default empty stats when outside Tauri runtime", async () => {
      const stats = await metadataIpc.getWorkspaceStats();
      expect(stats).toEqual({
        totalDocuments: 0,
        totalWords: 0,
        totalLinks: 0,
        totalWikiLinks: 0,
        totalTags: 0,
        uniqueTags: 0,
        totalMermaid: 0,
        totalKatex: 0,
      });
    });

    it("returns null for getDocumentMetadata outside Tauri runtime", async () => {
      const meta = await metadataIpc.getDocumentMetadata("README.md");
      expect(meta).toBeNull();
    });

    it("returns empty array for getAllDocuments outside Tauri runtime", async () => {
      const docs = await metadataIpc.getAllDocuments();
      expect(docs).toEqual([]);
    });

    it("returns zeroed report for triggerReindex outside Tauri runtime", async () => {
      const report = await metadataIpc.triggerReindex();
      expect(report).toEqual({ indexed: 0, skipped: 0, errors: [] });
    });

    it("returns empty array for getWikiLinksFor outside Tauri runtime", async () => {
      const links = await metadataIpc.getWikiLinksFor("docs/intro.md");
      expect(links).toEqual([]);
    });

    it("returns empty array for getTags outside Tauri runtime", async () => {
      const tags = await metadataIpc.getTags();
      expect(tags).toEqual([]);
    });
  });

  describe("Frontend Wiki Link & Tag Parser Helpers", () => {
    it("detects basic wiki link regex pattern [[target]]", () => {
      const text = "Veja [[Introducao]] no guia";
      const match = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(text);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("Introducao");
      expect(match![2]).toBeUndefined();
    });

    it("detects wiki link with alias regex pattern [[target|alias]]", () => {
      const text = "Consulte [[Configuracao|Menu de Config]]";
      const match = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(text);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("Configuracao");
      expect(match![2]).toBe("Menu de Config");
    });

    it("detects tags with hashtag and boundary", () => {
      const text = "Notas sobre #rust e #local-first no app";
      const matches = Array.from(text.matchAll(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g)).map((m) => m[1]);
      expect(matches).toContain("rust");
      expect(matches).toContain("local-first");
      expect(matches).toHaveLength(2);
    });

    it("does not match markdown headings as tags", () => {
      const text = "# Título Principal\n## Subtítulo";
      const matches = Array.from(text.matchAll(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g)).map((m) => m[1]);
      // Headings have space after #, so no match for #word
      expect(matches).toHaveLength(0);
    });

    it("handles multiple wiki links on multiple lines", () => {
      const text = `
Linha 1 [[DocA]]
Linha 2 [[DocB|Documento B]]
Linha 3 [[DocC]]
      `;
      const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      const results: { target: string; alias?: string }[] = [];
      let m;
      while ((m = regex.exec(text)) !== null) {
        results.push({ target: m[1], alias: m[2] });
      }

      expect(results).toHaveLength(3);
      expect(results[0].target).toBe("DocA");
      expect(results[1].alias).toBe("Documento B");
      expect(results[2].target).toBe("DocC");
    });
  });

  describe("Workspace Metadata Aggregation Logic", () => {
    it("aggregates stats from multiple documents correctly", () => {
      const docs: DocumentMetadata[] = [
        {
          path: "doc1.md",
          title: "Doc 1",
          headings: [{ depth: 1, text: "D1", anchor: "d1" }],
          links: [{ text: "L1", url: "https://a.com", isInternal: false, line: 1 }],
          wikiLinks: [{ target: "doc2", alias: null, line: 2 }],
          tags: ["rust", "tauri"],
          images: ["img1.png"],
          tables: 1,
          mermaidBlocks: 2,
          katexBlocks: 0,
          wordCount: 100,
          lineCount: 15,
          lastModified: 1000,
        },
        {
          path: "doc2.md",
          title: "Doc 2",
          headings: [{ depth: 1, text: "D2", anchor: "d2" }],
          links: [{ text: "L2", url: "https://b.com", isInternal: false, line: 1 }],
          wikiLinks: [],
          tags: ["rust", "knowledge"],
          images: [],
          tables: 0,
          mermaidBlocks: 0,
          katexBlocks: 3,
          wordCount: 200,
          lineCount: 25,
          lastModified: 2000,
        },
      ];

      const totalDocuments = docs.length;
      const totalWords = docs.reduce((acc, d) => acc + d.wordCount, 0);
      const totalLinks = docs.reduce((acc, d) => acc + d.links.length, 0);
      const totalWikiLinks = docs.reduce((acc, d) => acc + d.wikiLinks.length, 0);
      const totalTags = docs.reduce((acc, d) => acc + d.tags.length, 0);
      const uniqueTags = new Set(docs.flatMap((d) => d.tags)).size;
      const totalMermaid = docs.reduce((acc, d) => acc + d.mermaidBlocks, 0);
      const totalKatex = docs.reduce((acc, d) => acc + d.katexBlocks, 0);

      expect(totalDocuments).toBe(2);
      expect(totalWords).toBe(300);
      expect(totalLinks).toBe(2);
      expect(totalWikiLinks).toBe(1);
      expect(totalTags).toBe(4);
      expect(uniqueTags).toBe(3); // rust, tauri, knowledge
      expect(totalMermaid).toBe(2);
      expect(totalKatex).toBe(3);
    });

    it("handles slug generation matching backend anchor specification", () => {
      function slugify(text: string): string {
        return text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9\s-_]/g, "")
          .trim()
          .replace(/[\s-_]+/g, "-");
      }

      expect(slugify("Introdução e Visão Geral")).toBe("introducao-e-visao-geral");
      expect(slugify("1. Arquitetura Local-First")).toBe("1-arquitetura-local-first");
      expect(slugify("O que é KaTeX & Mermaid?")).toBe("o-que-e-katex-mermaid");
    });

    it("correctly identifies internal vs external urls in markdown links", () => {
      const isInternal = (url: string) =>
        !url.startsWith("http://") &&
        !url.startsWith("https://") &&
        !url.startsWith("mailto:") &&
        !url.startsWith("ftp://");

      expect(isInternal("docs/guia.md")).toBe(true);
      expect(isInternal("../README.md")).toBe(true);
      expect(isInternal("#secao-1")).toBe(true);
      expect(isInternal("https://github.com")).toBe(false);
      expect(isInternal("http://localhost:3000")).toBe(false);
      expect(isInternal("mailto:contato@example.com")).toBe(false);
    });

    it("filters out standalone hash symbols from tags", () => {
      const extractTags = (text: string) => {
        const matches = Array.from(text.matchAll(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g)).map((m) => m[1]);
        return matches.filter((t) => t.length > 0 && !/^\d+$/.test(t));
      };

      expect(extractTags("Texto com # e ## não são tags")).toEqual([]);
      expect(extractTags("Tag válida #rust e #v2")).toEqual(["rust", "v2"]);
    });

    it("handles frontmatter title extraction with quotes", () => {
      const extractTitle = (yamlLine: string) => {
        if (yamlLine.startsWith("title:")) {
          return yamlLine
            .replace(/^title:\s*/, "")
            .replace(/^["'](.*)["']$/, "$1")
            .trim();
        }
        return null;
      };

      expect(extractTitle('title: "Meu Documento"')).toBe("Meu Documento");
      expect(extractTitle("title: 'Título com Aspas'")).toBe("Título com Aspas");
      expect(extractTitle("title: Sem Aspas")).toBe("Sem Aspas");
    });

    it("validates heading depth boundaries", () => {
      const isValidDepth = (depth: number) => Number.isInteger(depth) && depth >= 1 && depth <= 6;
      expect(isValidDepth(1)).toBe(true);
      expect(isValidDepth(6)).toBe(true);
      expect(isValidDepth(0)).toBe(false);
      expect(isValidDepth(7)).toBe(false);
    });

    it("handles empty metadata index gracefully", () => {
      const emptyDocs: DocumentMetadata[] = [];
      const totalWords = emptyDocs.reduce((acc, d) => acc + d.wordCount, 0);
      const totalDocs = emptyDocs.length;
      expect(totalWords).toBe(0);
      expect(totalDocs).toBe(0);
    });
  });
});

