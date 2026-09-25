import { describe, expect, it } from "vitest";
import {
  getSmartReferenceCandidates,
  resolveSmartReference,
  handleCtrlClickNavigation,
} from "../../src/editor/smartReferences";
import type { WikiDocumentCandidate } from "../../src/editor/wiki/wiki-completion";

const testDocs: WikiDocumentCandidate[] = [
  {
    path: "docs/architecture.md",
    title: "Architecture",
    headings: [
      { depth: 1, text: "Overview", anchor: "overview" },
      { depth: 2, text: "Data Flow", anchor: "data-flow" },
    ],
  },
  {
    path: "notes/api.md",
    title: "API Guide",
    headings: [{ depth: 1, text: "Endpoints", anchor: "endpoints" }],
  },
  {
    path: "README.md",
    title: null,
  },
  {
    path: "assets/diagram.png",
    title: null,
  },
  {
    path: "duplicate/arch.md",
    title: "Architecture",
  },
];

describe("Smart References (MD-V03-013)", () => {
  it("completes relative path candidates within workspace in < 50ms", () => {
    const t0 = performance.now();
    const candidates = getSmartReferenceCandidates(testDocs, "docs");
    const duration = performance.now() - t0;

    expect(duration).toBeLessThan(50);
    expect(candidates.some((c) => c.detail === "docs/architecture.md")).toBe(true);
  });

  it("completes headings with # syntax", () => {
    const candidates = getSmartReferenceCandidates(testDocs, "Architecture#");
    expect(candidates).toHaveLength(2);
    expect(candidates[0].label).toBe("Architecture#Overview");
    expect(candidates[1].label).toBe("Architecture#Data Flow");
  });

  it("resolves unique target deterministically", () => {
    const res = resolveSmartReference("API Guide", testDocs);
    expect(res.status).toBe("resolved");
    expect(res.path).toBe("notes/api.md");
  });

  it("marks missing target as unresolved", () => {
    const res = resolveSmartReference("non-existent-note", testDocs);
    expect(res.status).toBe("unresolved");
    expect(res.path).toBeNull();
  });

  it("marks duplicate target as ambiguous", () => {
    const res = resolveSmartReference("Architecture", testDocs);
    expect(res.status).toBe("ambiguous");
    expect(res.path).toBe("docs/architecture.md");
  });

  it("refuses remote URLs and marks as insecure", () => {
    const httpRes = resolveSmartReference("https://malicious.site/script", testDocs);
    expect(httpRes.status).toBe("insecure");
    expect(httpRes.path).toBeNull();

    const mailtoRes = resolveSmartReference("mailto:test@example.com", testDocs);
    expect(mailtoRes.status).toBe("insecure");
  });

  it("enforces path fence and rejects traversal attempts (../)", () => {
    const traversal = resolveSmartReference("../../etc/passwd", testDocs);
    expect(traversal.status).toBe("insecure");
    expect(traversal.path).toBeNull();
  });

  it("Ctrl+Click navigates only to unique resolved destination", () => {
    const validNav = handleCtrlClickNavigation("API Guide", testDocs);
    expect(validNav).toEqual({ path: "notes/api.md", anchor: null });

    const ambiguousNav = handleCtrlClickNavigation("Architecture", testDocs);
    expect(ambiguousNav).toBeNull();

    const remoteNav = handleCtrlClickNavigation("https://google.com", testDocs);
    expect(remoteNav).toBeNull();

    const traversalNav = handleCtrlClickNavigation("../secret", testDocs);
    expect(traversalNav).toBeNull();
  });
});
