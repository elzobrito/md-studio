import { describe, it, expect, beforeEach } from 'vitest';
import { BoundedArtifactCache } from '../../src/services/runtime/artifactCache';
import { SemanticPipeline } from '../../src/services/runtime/semanticPipeline';
import type { PreviewArtifact } from '../../src/services/runtime/semanticModel';

describe('Task 053-G: Semantic Pipeline & Bounded Artifact Caches', () => {
  describe('BoundedArtifactCache', () => {
    let cache: BoundedArtifactCache<PreviewArtifact>;

    beforeEach(() => {
      cache = new BoundedArtifactCache<PreviewArtifact>({
        maxEntries: 3,
        maxEstimatedBytes: 10000,
      });
    });

    it('records hits and misses accurately with exact key matching', () => {
      const art1: PreviewArtifact = {
        documentId: 'doc-1',
        operationGeneration: 1,
        contentIdentity: 'hash-a',
        html: '<p>A</p>',
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      };

      cache.put(art1);

      // Miss on non-existent document
      const miss1 = cache.get('doc-999', 'hash-a', 1);
      expect(miss1).toBeNull();

      // Miss on wrong generation or identity
      const miss2 = cache.get('doc-1', 'hash-b', 1);
      expect(miss2).toBeNull();
      const miss3 = cache.get('doc-1', 'hash-a', 2);
      expect(miss3).toBeNull();

      // Hit on exact match
      const hit = cache.get('doc-1', 'hash-a', 1);
      expect(hit).toEqual(art1);

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(3);
      expect(metrics.entries).toBe(1);
    });

    it('enforces maxEntries via deterministic LRU eviction', () => {
      const makeArt = (id: string, gen: number, weight = 100): PreviewArtifact => ({
        documentId: id,
        operationGeneration: gen,
        contentIdentity: `hash-${id}-${gen}`,
        html: `<p>${id}</p>`,
        diagnostics: [],
        estimatedWeightBytes: weight,
        createdAt: Date.now(),
      });

      cache.put(makeArt('doc-1', 1));
      cache.put(makeArt('doc-2', 1));
      cache.put(makeArt('doc-3', 1));

      expect(cache.getMetrics().entries).toBe(3);
      expect(cache.getMetrics().evictions).toBe(0);

      // Access doc-1 to make it recently used
      cache.get('doc-1', 'hash-doc-1-1', 1);

      // Adding 4th item should evict doc-2 (the oldest unaccessed)
      cache.put(makeArt('doc-4', 1));

      expect(cache.getMetrics().entries).toBe(3);
      expect(cache.getMetrics().evictions).toBe(1);
      expect(cache.get('doc-2', 'hash-doc-2-1', 1)).toBeNull(); // evicted
      expect(cache.get('doc-1', 'hash-doc-1-1', 1)).not.toBeNull(); // preserved
      expect(cache.get('doc-3', 'hash-doc-3-1', 1)).not.toBeNull();
      expect(cache.get('doc-4', 'hash-doc-4-1', 1)).not.toBeNull();
    });

    it('enforces maxEstimatedBytes eviction by payload weight', () => {
      const byteBoundedCache = new BoundedArtifactCache<PreviewArtifact>({
        maxEntries: 10,
        maxEstimatedBytes: 500,
      });

      const artA: PreviewArtifact = {
        documentId: 'doc-A',
        operationGeneration: 1,
        contentIdentity: 'hash-A',
        html: '<p>A</p>',
        diagnostics: [],
        estimatedWeightBytes: 300,
        createdAt: Date.now(),
      };

      const artB: PreviewArtifact = {
        documentId: 'doc-B',
        operationGeneration: 1,
        contentIdentity: 'hash-B',
        html: '<p>B</p>',
        diagnostics: [],
        estimatedWeightBytes: 300,
        createdAt: Date.now(),
      };

      byteBoundedCache.put(artA);
      expect(byteBoundedCache.getMetrics().estimatedBytes).toBe(300);

      // Adding artB (300 bytes) exceeds 500 bytes limit -> artA evicted
      byteBoundedCache.put(artB);

      const metrics = byteBoundedCache.getMetrics();
      expect(metrics.entries).toBe(1);
      expect(metrics.estimatedBytes).toBe(300);
      expect(metrics.evictions).toBe(1);
      expect(byteBoundedCache.get('doc-A', 'hash-A', 1)).toBeNull();
      expect(byteBoundedCache.get('doc-B', 'hash-B', 1)).not.toBeNull();
    });

    it('prioritizes preserving activeDocumentId during eviction if other candidates exist', () => {
      const art1: PreviewArtifact = {
        documentId: 'active-doc',
        operationGeneration: 1,
        contentIdentity: 'hash-1',
        html: 'Active',
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      };
      const art2: PreviewArtifact = {
        documentId: 'inactive-doc',
        operationGeneration: 1,
        contentIdentity: 'hash-2',
        html: 'Inactive',
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      };
      const art3: PreviewArtifact = {
        documentId: 'inactive-doc-2',
        operationGeneration: 1,
        contentIdentity: 'hash-3',
        html: 'Inactive 2',
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      };
      const art4: PreviewArtifact = {
        documentId: 'incoming-doc',
        operationGeneration: 1,
        contentIdentity: 'hash-4',
        html: 'Incoming',
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      };

      cache.setActiveDocumentId('active-doc');
      cache.put(art1); // first in
      cache.put(art2);
      cache.put(art3);

      // Adding 4th item when max is 3: art1 is oldest, but it is active-doc.
      // So art2 should be evicted first!
      cache.put(art4);

      expect(cache.get('active-doc', 'hash-1', 1)).not.toBeNull();
      expect(cache.get('inactive-doc', 'hash-2', 1)).toBeNull(); // evicted
    });

    it('evicts all artifacts of a closed document via evictDocument', () => {
      const art1: PreviewArtifact = {
        documentId: 'doc-X',
        operationGeneration: 1,
        contentIdentity: 'h1',
        html: '1',
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      };
      const art2: PreviewArtifact = {
        documentId: 'doc-X',
        operationGeneration: 2,
        contentIdentity: 'h2',
        html: '2',
        diagnostics: [],
        estimatedWeightBytes: 100,
        createdAt: Date.now(),
      };

      cache.put(art1);
      cache.put(art2);
      expect(cache.getMetrics().entries).toBe(2);

      cache.evictDocument('doc-X');
      expect(cache.getMetrics().entries).toBe(0);
      expect(cache.get('doc-X', 'h1', 1)).toBeNull();
      expect(cache.get('doc-X', 'h2', 2)).toBeNull();
    });
  });

  describe('SemanticPipeline', () => {
    let pipeline: SemanticPipeline;

    beforeEach(() => {
      pipeline = new SemanticPipeline();
    });

    it('computes DocumentSemanticModel completely decoupled from DOM', () => {
      const markdown = `---
title: Architectural Plan
tags: [spec, gui]
---

# Introduction

This is the introduction text with a [Wiki Reference](docs/arch.md).

## Implementation Details

- TODO: finish parser
- FIXME: fix memory leak ^block-fixme

\`\`\`mermaid
graph TD
A --> B
\`\`\`
`;

      const model = pipeline.computeSemanticModel(
        'doc-100',
        1,
        'sha256-abc',
        markdown,
        'docs/plan.md'
      );

      expect(model.documentId).toBe('doc-100');
      expect(model.operationGeneration).toBe(1);
      expect(model.contentIdentity).toBe('sha256-abc');
      expect(model.headings.length).toBe(2);
      expect(model.headings[0].text).toBe('Introduction');
      expect(model.headings[1].text).toBe('Implementation Details');
      expect(model.frontmatter?.title).toBe('Architectural Plan');
      expect(model.todos.length).toBe(2);
      expect(model.blocks.length).toBe(1);
      expect(model.blocks[0].id).toBe('block-fixme');
      expect(model.hasDiagrams).toBe(true);
      expect(model.metrics.headingCount).toBe(2);
      expect(model.metrics.todoCount).toBe(2);
      expect(model.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    });

    it('reuses cached semantic model when generation and identity match', () => {
      const markdown = '# Pure Heading\nSome content';
      const m1 = pipeline.getOrComputeSemanticModel('doc-1', 1, 'h1', markdown);
      const metrics1 = pipeline.getSemanticMetrics();
      expect(metrics1.hits).toBe(0);
      expect(metrics1.entries).toBe(1);

      const m2 = pipeline.getOrComputeSemanticModel('doc-1', 1, 'h1', markdown);
      const metrics2 = pipeline.getSemanticMetrics();
      expect(metrics2.hits).toBe(1);
      expect(m2).toBe(m1); // reference equality from cache
    });

    it('rejects stale async preview results when document state moved forward', async () => {
      let liveGen = 1;
      let liveHash = 'hash-gen-1';

      // Start async preview for gen 1
      const previewPromise = pipeline.getOrComputePreview(
        'doc-race',
        1,
        'hash-gen-1',
        '# Document Version 1',
        () => ({ operationGeneration: liveGen, contentIdentity: liveHash })
      );

      // Simulate user typing another character immediately before preview completes:
      liveGen = 2;
      liveHash = 'hash-gen-2';

      const result = await previewPromise;
      // Stale guard must have caught that live state changed and returned null (rejected)
      expect(result).toBeNull();

      // Verify that stale result was not stored in the cache
      expect(pipeline.getPreviewMetrics().entries).toBe(0);
    });

    it('accepts and caches async preview result when document state remained current', async () => {
      const liveGen = 3;
      const liveHash = 'hash-gen-3';

      const result = await pipeline.getOrComputePreview(
        'doc-good',
        liveGen,
        liveHash,
        '# Document Version 3\n\nContent here',
        () => ({ operationGeneration: liveGen, contentIdentity: liveHash })
      );

      expect(result).not.toBeNull();
      expect(result?.html).toContain('Document Version 3');
      expect(result?.operationGeneration).toBe(3);
      expect(result?.contentIdentity).toBe(liveHash);
      expect(pipeline.getPreviewMetrics().entries).toBe(1);

      // Subsequent call with exact match hits cache synchronously
      const hit = await pipeline.getOrComputePreview('doc-good', liveGen, liveHash, '');
      expect(hit).toBe(result);
      expect(pipeline.getPreviewMetrics().hits).toBe(1);
    });
  });
});
