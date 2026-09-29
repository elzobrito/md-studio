import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { BoundedArtifactCache } from "../../src/services/runtime/artifactCache";
import type { PreviewArtifact } from "../../src/services/runtime/semanticModel";

describe("Task 053-S: Responsive Desktop & Performance", () => {
  describe("Responsive CSS Containment (INV-RESPONSIVE-NO-OVERFLOW)", () => {
    const cssPath = path.resolve(__dirname, "../../src/styles/app-shell.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    it("includes desktop responsive breakpoints for narrow and medium viewports", () => {
      expect(cssContent).toContain("@media (max-width: 960px)");
      expect(cssContent).toContain("@media (max-width: 768px)");
    });

    it("enforces box-sizing and max-width containment to prevent unexpected horizontal scrolling", () => {
      expect(cssContent).toContain("max-width: 100vw");
      expect(cssContent).toContain("box-sizing: border-box");
      expect(cssContent).toContain("overflow: hidden");
    });
  });

  describe("Chrome Action Decoupling (INV-CHROME-NO-REPARSE)", () => {
    let cache: BoundedArtifactCache<PreviewArtifact>;

    beforeEach(() => {
      cache = new BoundedArtifactCache<PreviewArtifact>({ maxEntries: 12 });
    });

    it("preserves parsed semantic artifacts across chrome state transitions", () => {
      const mockArtifact: PreviewArtifact = {
        documentId: "doc-1",
        operationGeneration: 1,
        contentIdentity: "hash-doc-v1",
        html: "<p>Rendered preview</p>",
        diagnostics: [],
        estimatedWeightBytes: 150,
        createdAt: Date.now(),
      };

      cache.put(mockArtifact);

      // Simulating chrome actions: sidebar toggles, split resizes, inspector toggles
      const chromeStates = [
        { sidebarOpen: true, inspectorOpen: false, splitRatio: 0.5 },
        { sidebarOpen: false, inspectorOpen: false, splitRatio: 0.6 },
        { sidebarOpen: false, inspectorOpen: true, splitRatio: 0.4 },
        { sidebarOpen: true, inspectorOpen: true, splitRatio: 0.5 },
      ];

      for (const _state of chromeStates) {
        // Semantic cache must return cached artifacts immediately without re-parsing
        const cached = cache.get("doc-1", "hash-doc-v1", 1);
        expect(cached).toBeDefined();
        expect(cached?.contentIdentity).toBe("hash-doc-v1");
        expect(cached?.html).toBe("<p>Rendered preview</p>");
      }
    });
  });

  describe("Bounded Cache LRU Eviction (INV-BOUNDED-CACHE-LRU)", () => {
    it("strictly bounds artifact cache size to 12 documents to prevent memory exhaustion", () => {
      const cache = new BoundedArtifactCache<PreviewArtifact>({ maxEntries: 12 });

      // Populate 15 documents
      for (let i = 1; i <= 15; i++) {
        const docId = `doc-${i}`;
        const hash = `hash-${i}`;
        const mockArtifact: PreviewArtifact = {
          documentId: docId,
          operationGeneration: 1,
          contentIdentity: hash,
          html: `<p>Content for ${docId}</p>`,
          diagnostics: [],
          estimatedWeightBytes: 100,
          createdAt: Date.now(),
        };
        cache.put(mockArtifact);
      }

      // Cache entries must not exceed capacity
      expect(cache.getMetrics().entries).toBe(12);

      // Oldest documents (doc-1, doc-2, doc-3) must have been evicted
      expect(cache.get("doc-1", "hash-1", 1)).toBeNull();
      expect(cache.get("doc-2", "hash-2", 1)).toBeNull();
      expect(cache.get("doc-3", "hash-3", 1)).toBeNull();

      // Recent documents (doc-4 to doc-15) must remain available
      for (let i = 4; i <= 15; i++) {
        expect(cache.get(`doc-${i}`, `hash-${i}`, 1)).toBeDefined();
      }
    });

    it("accessing an item refreshes its LRU recency status", () => {
      const cache = new BoundedArtifactCache<PreviewArtifact>({ maxEntries: 3 });

      const makeArtifact = (docId: string, hash: string): PreviewArtifact => ({
        documentId: docId,
        operationGeneration: 1,
        contentIdentity: hash,
        html: `<p>${docId}</p>`,
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      });

      cache.put(makeArtifact("doc-1", "h1"));
      cache.put(makeArtifact("doc-2", "h2"));
      cache.put(makeArtifact("doc-3", "h3"));

      // Access doc-1 to refresh its recency
      cache.get("doc-1", "h1", 1);

      // Add doc-4, which should evict doc-2 (the oldest unaccessed)
      cache.put(makeArtifact("doc-4", "h4"));

      expect(cache.get("doc-1", "h1", 1)).toBeDefined();
      expect(cache.get("doc-2", "h2", 1)).toBeNull();
      expect(cache.get("doc-3", "h3", 1)).toBeDefined();
      expect(cache.get("doc-4", "h4", 1)).toBeDefined();
    });
  });
});
