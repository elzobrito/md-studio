import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractDiagramRecords,
  DiagramStatusStore,
  MermaidExplorerService,
  type DiagramIndexRecord,
  type DiagramRenderStatus,
} from "../../src/services/mermaidExplorer";

describe("Mermaid Explorer (Spec 051)", () => {
  // -----------------------------------------------------------------------
  // extractDiagramRecords
  // -----------------------------------------------------------------------
  describe("extractDiagramRecords", () => {
    it("extracts mermaid blocks with correct line numbers and ordinals", () => {
      const md = [
        "# Title",
        "",
        "Some text",
        "",
        "```mermaid",
        "flowchart TD",
        "  A --> B",
        "```",
        "",
        "More text",
        "",
        "```mermaid",
        "sequenceDiagram",
        "  Alice->>Bob: Hello",
        "```",
      ].join("\n");

      const records = extractDiagramRecords(md, "docs/arch.md");
      expect(records).toHaveLength(2);

      expect(records[0].path).toBe("docs/arch.md");
      expect(records[0].blockId).toBe("docs/arch.md:mermaid-0");
      expect(records[0].line).toBe(5); // 1-indexed
      expect(records[0].endLine).toBe(8);
      expect(records[0].ordinal).toBe(0);
      expect(records[0].type).toBe("flowchart");
      expect(records[0].source).toContain("flowchart TD");

      expect(records[1].blockId).toBe("docs/arch.md:mermaid-1");
      expect(records[1].line).toBe(12);
      expect(records[1].type).toBe("sequenceDiagram");
      expect(records[1].ordinal).toBe(1);
    });

    it("detects various diagram types", () => {
      const types = [
        "flowchart LR",
        "graph TD",
        "sequenceDiagram",
        "classDiagram",
        "stateDiagram-v2",
        "erDiagram",
        "gantt",
        "pie",
        "gitGraph",
        "mindmap",
      ];
      for (const t of types) {
        const md = `\`\`\`mermaid\n${t}\n  A\n\`\`\``;
        const records = extractDiagramRecords(md, "test.md");
        expect(records).toHaveLength(1);
        const expected = t.split(" ")[0];
        expect(records[0].type).toBe(expected);
      }
    });

    it("returns null type for unknown diagram syntax", () => {
      const md = "```mermaid\nsomething unknown\n```";
      const records = extractDiagramRecords(md, "test.md");
      expect(records).toHaveLength(1);
      expect(records[0].type).toBeNull();
    });

    it("ignores non-mermaid code fences", () => {
      const md = [
        "```javascript",
        "console.log('hello');",
        "```",
        "",
        "```mermaid",
        "pie",
        '  "A" : 40',
        "```",
        "",
        "```python",
        "print('hi')",
        "```",
      ].join("\n");

      const records = extractDiagramRecords(md, "code.md");
      expect(records).toHaveLength(1);
      expect(records[0].type).toBe("pie");
    });

    it("skips empty mermaid blocks", () => {
      const md = "```mermaid\n\n```";
      const records = extractDiagramRecords(md, "empty.md");
      expect(records).toHaveLength(0);
    });

    it("produces stable sourceHash for identical content", () => {
      const md = "```mermaid\nflowchart TD\n  A-->B\n```";
      const r1 = extractDiagramRecords(md, "a.md");
      const r2 = extractDiagramRecords(md, "b.md");
      expect(r1[0].sourceHash).toBe(r2[0].sourceHash);
    });

    it("produces different sourceHash for different content", () => {
      const md1 = "```mermaid\nflowchart TD\n  A-->B\n```";
      const md2 = "```mermaid\nflowchart TD\n  A-->C\n```";
      const r1 = extractDiagramRecords(md1, "a.md");
      const r2 = extractDiagramRecords(md2, "a.md");
      expect(r1[0].sourceHash).not.toBe(r2[0].sourceHash);
    });
  });

  // -----------------------------------------------------------------------
  // DiagramStatusStore (§44 — runtime/transitório)
  // -----------------------------------------------------------------------
  describe("DiagramStatusStore", () => {
    let store: DiagramStatusStore;

    beforeEach(() => {
      store = new DiagramStatusStore();
    });

    it("defaults to unrendered for unknown blockId", () => {
      expect(store.getStatus("unknown")).toBe("unrendered");
    });

    it("tracks rendering → rendered lifecycle", () => {
      store.setRendering("block-1");
      expect(store.getStatus("block-1")).toBe("rendering");

      store.setRendered("block-1", "<svg>ok</svg>");
      expect(store.getStatus("block-1")).toBe("rendered");
      expect(store.getSvg("block-1")).toBe("<svg>ok</svg>");
    });

    it("tracks invalid status with error message", () => {
      store.setInvalid("block-2", "Parse error at line 3");
      expect(store.getStatus("block-2")).toBe("invalid");
      expect(store.getError("block-2")).toBe("Parse error at line 3");
    });

    it("builds combined DiagramRecord from index + status", () => {
      const index: DiagramIndexRecord = {
        path: "doc.md",
        blockId: "doc.md:mermaid-0",
        line: 5,
        endLine: 10,
        ordinal: 0,
        type: "flowchart",
        sourceHash: "abc",
        source: "flowchart TD\n  A-->B",
      };

      store.setRendered("doc.md:mermaid-0", "<svg>chart</svg>");
      const record = store.toDiagramRecord(index);

      expect(record.status).toBe("rendered");
      expect(record.svgContent).toBe("<svg>chart</svg>");
      expect(record.path).toBe("doc.md");
      expect(record.type).toBe("flowchart");
    });

    it("clears all statuses", () => {
      store.setRendered("a", "<svg/>");
      store.setInvalid("b", "err");
      store.clear();
      expect(store.getStatus("a")).toBe("unrendered");
      expect(store.getStatus("b")).toBe("unrendered");
    });
  });

  // -----------------------------------------------------------------------
  // MermaidExplorerService — workspace catalog
  // -----------------------------------------------------------------------
  describe("MermaidExplorerService", () => {
    let service: MermaidExplorerService;

    beforeEach(() => {
      service = new MermaidExplorerService();
    });

    it("indexes a document and returns its diagrams", () => {
      const md = "```mermaid\nflowchart TD\n  A-->B\n```";
      service.indexDocument("readme.md", md);

      const diagrams = service.getDocumentDiagrams("readme.md");
      expect(diagrams).toHaveLength(1);
      expect(diagrams[0].type).toBe("flowchart");
      expect(diagrams[0].status).toBe("unrendered");
    });

    it("returns empty list for unindexed document", () => {
      expect(service.getDocumentDiagrams("nope.md")).toHaveLength(0);
    });

    it("aggregates diagrams across workspace", () => {
      service.indexDocument("a.md", "```mermaid\nflowchart TD\n  A-->B\n```");
      service.indexDocument("b.md", "```mermaid\npie\n  \"X\": 50\n```\n\n```mermaid\ngantt\n  A :a1, 2024-01-01, 30d\n```");

      const all = service.getWorkspaceDiagrams();
      expect(all).toHaveLength(3);
      expect(service.getWorkspaceCount()).toBe(3);
    });

    it("removes a document from the index", () => {
      service.indexDocument("a.md", "```mermaid\npie\n  \"A\": 1\n```");
      expect(service.getWorkspaceCount()).toBe(1);

      service.removeDocument("a.md");
      expect(service.getWorkspaceCount()).toBe(0);
      expect(service.getDocumentDiagrams("a.md")).toHaveLength(0);
    });

    it("notifies subscribers on index changes", () => {
      const listener = vi.fn();
      const unsub = service.subscribe(listener);

      service.indexDocument("a.md", "```mermaid\npie\n  \"X\":1\n```");
      expect(listener).toHaveBeenCalledTimes(1);

      service.removeDocument("a.md");
      expect(listener).toHaveBeenCalledTimes(2);

      unsub();
      service.indexDocument("b.md", "```mermaid\ngantt\n  A:a1,2024-01-01,30d\n```");
      expect(listener).toHaveBeenCalledTimes(2); // Not called after unsub
    });

    it("re-indexes a document on content change", () => {
      service.indexDocument("doc.md", "```mermaid\npie\n  \"A\":1\n```");
      expect(service.getDocumentDiagrams("doc.md")).toHaveLength(1);

      service.indexDocument("doc.md", "no diagrams here");
      expect(service.getDocumentDiagrams("doc.md")).toHaveLength(0);
    });

    it("clear removes all data", () => {
      service.indexDocument("a.md", "```mermaid\npie\n  \"A\":1\n```");
      service.indexDocument("b.md", "```mermaid\ngantt\n  A:a1,2024-01-01,30d\n```");
      service.clear();
      expect(service.getWorkspaceCount()).toBe(0);
    });
  });
});
