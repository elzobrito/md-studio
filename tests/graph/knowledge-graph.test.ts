import { describe, expect, it } from "vitest";
import {
  buildLocalKnowledgeGraph,
  computeLocalImpact,
  queryLocalSubgraph,
} from "../../src/services/knowledgeGraph";

describe("Knowledge Graph service", () => {
  const sampleDocs = [
    {
      path: "docs/architecture.md",
      title: "Architecture",
      headings: [{ depth: 1, text: "Storage", anchor: "storage" }],
      blocks: [{ id: "atomic-save", snippet: "Atomic save" }],
      tags: ["#architecture", "#core"],
      images: ["assets/diagram.png"],
      wikiLinks: [
        { target: "Security" },
        { target: "Security#^token-auth" },
        { target: "future-roadmap" },
      ],
    },
    {
      path: "docs/security.md",
      title: "Security",
      blocks: [{ id: "token-auth", snippet: "Token auth block" }],
      wikiLinks: [],
    },
  ];

  it("builds deterministic graph snapshot with nodes and edges", () => {
    const graph = buildLocalKnowledgeGraph(sampleDocs, ["future-roadmap"]);

    expect(graph.nodes.length).toBeGreaterThanOrEqual(7);
    expect(graph.edges.length).toBeGreaterThanOrEqual(6);
    expect(graph.hash).toBeTruthy();

    const docIds = graph.nodes.map((n) => n.id);
    expect(docIds).toContain("doc:docs/architecture.md");
    expect(docIds).toContain("doc:docs/security.md");
    expect(docIds).toContain("heading:docs/architecture.md#storage");
    expect(docIds).toContain("block:docs/architecture.md#^atomic-save");
    expect(docIds).toContain("asset:assets/diagram.png");
    expect(docIds).toContain("tag:architecture");
    expect(docIds).toContain("placeholder:future-roadmap");
  });

  it("queries 1-hop and 2-hop contextual subgraphs", () => {
    const graph = buildLocalKnowledgeGraph(sampleDocs, ["future-roadmap"]);
    const sub = queryLocalSubgraph(graph, "doc:docs/architecture.md", 1);

    expect(sub.centerId).toBe("doc:docs/architecture.md");
    expect(sub.nodes.length).toBeGreaterThan(1);
    expect(sub.edges.length).toBeGreaterThan(1);
    expect(sub.truncated).toBe(false);
  });

  it("computes impact report with directly affected documents", () => {
    const graph = buildLocalKnowledgeGraph(sampleDocs, ["future-roadmap"]);
    const impact = computeLocalImpact(graph, "doc:docs/security.md");

    expect(impact.inboundCount).toBe(1);
    expect(impact.directlyAffectedDocuments).toEqual(["docs/architecture.md"]);
  });
});
