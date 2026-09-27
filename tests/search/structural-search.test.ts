import { describe, it, expect } from "vitest";
import {
  buildLocalKnowledgeGraph,
  type DocumentMetadataInput,
} from "../../src/services/knowledgeGraph";
import {
  executeStructuralQuery,
  type StructuralQuery,
} from "../../src/services/structuralSearch";

describe("Structural Search Query Engine", () => {
  const docs: DocumentMetadataInput[] = [
    {
      path: "notes/project-a.md",
      title: "Project Alpha",
      tags: ["work", "active"],
      headings: [{ depth: 1, text: "Overview", anchor: "overview" }],
      images: ["assets/diagram.png"],
      wikiLinks: [
        { target: "notes/project-b.md" },
        { target: "notes/project-b.md#spec" },
      ],
    },
    {
      path: "notes/project-b.md",
      title: "Project Beta",
      tags: ["work"],
      headings: [{ depth: 2, text: "Specification", anchor: "spec" }],
      wikiLinks: [],
    },
    {
      path: "archive/old-note.md",
      title: "Old Archive Note",
      tags: ["archive"],
      wikiLinks: [],
    },
    {
      path: "drafts/isolated.md",
      title: "Isolated Draft",
      wikiLinks: [],
    },
    {
      path: "drafts/missing-ref.md",
      title: "Missing Ref",
      wikiLinks: [{ target: "non-existent-placeholder" }],
    },
  ];

  const snapshot = buildLocalKnowledgeGraph(docs, ["non-existent-placeholder"]);

  it("finds documents referencing a specific document (references_doc)", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "references_doc", value: "project-b" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(1);
    expect(res.items[0].path).toBe("notes/project-a.md");
    expect(res.items[0].matchedReasons.length).toBeGreaterThan(0);
  });

  it("finds documents with no incoming backlinks (no_backlinks)", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "no_backlinks" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    const paths = res.items.map((i) => i.path);
    // project-a has no incoming backlinks, old-note has none, isolated has none, missing-ref has none
    expect(paths).toContain("notes/project-a.md");
    expect(paths).toContain("archive/old-note.md");
    expect(paths).toContain("drafts/isolated.md");
    expect(paths).toContain("drafts/missing-ref.md");
    // project-b has incoming backlink from project-a
    expect(paths).not.toContain("notes/project-b.md");
  });

  it("finds completely isolated documents (is_orphan)", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "is_orphan" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    const paths = res.items.map((i) => i.path);
    expect(paths).toContain("archive/old-note.md");
    expect(paths).toContain("drafts/isolated.md");
    expect(paths).not.toContain("notes/project-a.md"); // has outgoing
    expect(paths).not.toContain("notes/project-b.md"); // has incoming
  });

  it("finds documents using an asset (uses_asset)", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "uses_asset", value: "diagram.png" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(1);
    expect(res.items[0].path).toBe("notes/project-a.md");
  });

  it("finds documents located in a specific folder (in_folder)", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "in_folder", value: "notes" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(2);
    const paths = res.items.map((i) => i.path);
    expect(paths).toContain("notes/project-a.md");
    expect(paths).toContain("notes/project-b.md");
  });

  it("finds documents pointing to a heading (points_to_heading)", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "points_to_heading", value: "spec" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(1);
    expect(res.items[0].path).toBe("notes/project-a.md");
  });

  it("finds documents with a tag (has_tag)", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "has_tag", value: "active" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(1);
    expect(res.items[0].path).toBe("notes/project-a.md");
  });

  it("finds documents with unresolved links", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "has_unresolved_links" }],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(1);
    expect(res.items[0].path).toBe("drafts/missing-ref.md");
  });

  it("supports boolean combinations: AND", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [
        { type: "in_folder", value: "notes" },
        { type: "has_tag", value: "active" },
      ],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(1);
    expect(res.items[0].path).toBe("notes/project-a.md");
  });

  it("supports boolean combinations: OR", async () => {
    const query: StructuralQuery = {
      combinator: "OR",
      predicates: [
        { type: "has_tag", value: "archive" },
        { type: "has_tag", value: "active" },
      ],
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(2);
    const paths = res.items.map((i) => i.path);
    expect(paths).toContain("notes/project-a.md");
    expect(paths).toContain("archive/old-note.md");
  });

  it("supports pagination with offset and limit", async () => {
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "no_backlinks" }],
      offset: 1,
      limit: 2,
    };

    const res = await executeStructuralQuery(snapshot, query);
    expect(res.totalCount).toBe(4);
    expect(res.items.length).toBe(2);
    expect(res.hasMore).toBe(true);
  });

  it("handles cancellation via AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [{ type: "no_backlinks" }],
    };

    await expect(
      executeStructuralQuery(snapshot, query, controller.signal),
    ).rejects.toThrow("aborted");
  });

  it("performs efficiently on 500 documents", async () => {
    const largeDocs: DocumentMetadataInput[] = [];
    for (let i = 0; i < 500; i++) {
      largeDocs.push({
        path: `vault/doc-${i}.md`,
        title: `Document ${i}`,
        tags: i % 2 === 0 ? ["even", "all"] : ["odd", "all"],
        wikiLinks: i > 0 ? [{ target: `vault/doc-${i - 1}.md` }] : [],
      });
    }

    const largeSnapshot = buildLocalKnowledgeGraph(largeDocs);
    const query: StructuralQuery = {
      combinator: "AND",
      predicates: [
        { type: "in_folder", value: "vault" },
        { type: "has_tag", value: "even" },
      ],
      limit: 50,
    };

    const start = performance.now();
    const res = await executeStructuralQuery(largeSnapshot, query);
    const duration = performance.now() - start;

    expect(res.totalCount).toBe(250);
    expect(res.items.length).toBe(50);
    expect(duration).toBeLessThan(150); // fast query execution
  });
});
