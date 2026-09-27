import { describe, it, expect } from 'vitest';
import { calculateWorkspaceAnalytics } from '../../src/services/workspaceAnalytics';
import type { GraphSnapshot } from '../../src/services/knowledgeGraph';

describe('Workspace Analytics calculation service', () => {
  const mockSnapshot: GraphSnapshot = {
    generation: 1,
    hash: 'mock-hash',
    nodes: [
      { id: 'doc:a.md', kind: 'document', label: 'Doc A', path: 'a.md' },
      { id: 'doc:b.md', kind: 'document', label: 'Doc B', path: 'b.md' },
      { id: 'doc:c.md', kind: 'document', label: 'Doc C', path: 'c.md' },
      { id: 'heading:a.md:h1', kind: 'heading', label: 'Heading 1', path: 'a.md' },
      { id: 'heading:b.md:h2', kind: 'heading', label: 'Heading 2', path: 'b.md' },
      { id: 'asset:img.png', kind: 'asset', label: 'img.png', path: 'assets/img.png' },
    ],
    edges: [
      // B links to A
      { from: 'doc:b.md', to: 'doc:a.md', relation: 'LINKS_TO' },
      // C references Heading in A
      { from: 'doc:c.md', to: 'heading:a.md:h1', relation: 'REFERENCES' },
      { from: 'doc:a.md', to: 'heading:a.md:h1', relation: 'CONTAINS' },
      // C uses img.png
      { from: 'doc:c.md', to: 'asset:img.png', relation: 'USES' },
    ],
  };

  it('calculates totals and link density accurately', () => {
    const report = calculateWorkspaceAnalytics(mockSnapshot, [
      { tag: 'TODO', path: 'a.md', line: 5, column: 1, text: 'todo 1' },
      { tag: 'FIXME', path: 'b.md', line: 10, column: 1, text: 'fixme 1' },
    ]);

    expect(report.overview.totalDocuments).toBe(3);
    expect(report.overview.totalHeadings).toBe(2);
    expect(report.overview.totalAssets).toBe(1);
    expect(report.overview.totalTodos).toBe(2);
    expect(report.overview.totalLinks).toBe(2); // b -> a, c -> a(h1)
    expect(report.overview.linkDensity).toBe(0.67); // 2 / 3
  });

  it('ranks most referenced and central documents correctly', () => {
    const report = calculateWorkspaceAnalytics(mockSnapshot);

    // Doc A receives 2 inbound links (from B and C), so it should be #1 most referenced
    expect(report.topReferenced[0].id).toBe('doc:a.md');
    expect(report.topReferenced[0].inboundLinks).toBe(2);

    // Doc A degree centrality: (in=2 + out=0) / (3 - 1) = 2 / 2 = 1.0
    expect(report.topCentral[0].id).toBe('doc:a.md');
    expect(report.topCentral[0].centralityScore).toBe(1);
  });

  it('provides explainers with formulas and descriptions', () => {
    const report = calculateWorkspaceAnalytics(mockSnapshot);
    expect(report.explainers).toHaveLength(3);
    expect(report.explainers[0].formula).toContain('totalLinks / totalDocumentos');
  });

  it('handles empty workspace safely without NaN or division by zero', () => {
    const emptySnapshot: GraphSnapshot = {
      generation: 1,
      hash: 'empty',
      nodes: [],
      edges: [],
    };

    const report = calculateWorkspaceAnalytics(emptySnapshot);
    expect(report.overview.totalDocuments).toBe(0);
    expect(report.overview.linkDensity).toBe(0);
    expect(report.topReferenced).toHaveLength(0);
    expect(report.topCentral).toHaveLength(0);
  });
});
