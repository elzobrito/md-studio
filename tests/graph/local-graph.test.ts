import { describe, it, expect } from 'vitest';
import { computeLocalGraphLayout } from '../../src/services/localGraphLayout';
import type { GraphEdge, GraphNode } from '../../src/services/knowledgeGraph';

describe('Local Graph Layout service', () => {
  const mockNodes: GraphNode[] = [
    { id: 'doc:center.md', kind: 'document', label: 'Center Doc', path: 'center.md' },
    { id: 'heading:center:intro', kind: 'heading', label: 'Intro', path: 'center.md' },
    { id: 'doc:neighbor-a.md', kind: 'document', label: 'Neighbor A', path: 'neighbor-a.md' },
    { id: 'doc:neighbor-b.md', kind: 'document', label: 'Neighbor B', path: 'neighbor-b.md' },
    { id: 'doc:hop2-x.md', kind: 'document', label: 'Hop 2 X', path: 'hop2-x.md' },
    { id: 'doc:hop2-y.md', kind: 'document', label: 'Hop 2 Y', path: 'hop2-y.md' },
    { id: 'doc:unrelated.md', kind: 'document', label: 'Unrelated', path: 'unrelated.md' },
  ];

  const mockEdges: GraphEdge[] = [
    // Center contains heading intro
    { from: 'doc:center.md', to: 'heading:center:intro', relation: 'CONTAINS' },
    // Center links to neighbor A
    { from: 'doc:center.md', to: 'doc:neighbor-a.md', relation: 'LINKS_TO' },
    // Neighbor B links to center
    { from: 'doc:neighbor-b.md', to: 'doc:center.md', relation: 'LINKS_TO' },

    // Hop 2: Neighbor A links to Hop2 X and Hop2 Y
    { from: 'doc:neighbor-a.md', to: 'doc:hop2-x.md', relation: 'REFERENCES' },
    { from: 'doc:neighbor-a.md', to: 'doc:hop2-y.md', relation: 'REFERENCES' },
  ];

  it('computes 1-hop layout centered on active document', () => {
    const layout = computeLocalGraphLayout(mockNodes, mockEdges, {
      centerId: 'doc:center.md',
      depth: 1,
      width: 800,
      height: 600,
    });

    expect(layout.centerNode).not.toBeNull();
    expect(layout.centerNode?.id).toBe('doc:center.md');
    expect(layout.centerNode?.x).toBe(400);
    expect(layout.centerNode?.y).toBe(300);

    // Hop 1 nodes should include: heading:center:intro, neighbor-a, neighbor-b
    const hop1Nodes = layout.nodes.filter((n) => n.hop === 1);
    expect(hop1Nodes).toHaveLength(3);

    // Hop 2 nodes should NOT be present when depth=1
    const hop2Nodes = layout.nodes.filter((n) => n.hop === 2);
    expect(hop2Nodes).toHaveLength(0);

    // Unrelated document should NOT be in layout
    expect(layout.nodes.some((n) => n.id === 'doc:unrelated.md')).toBe(false);
  });

  it('computes 2-hop layout expanding secondary neighbors', () => {
    const layout = computeLocalGraphLayout(mockNodes, mockEdges, {
      centerId: 'doc:center.md',
      depth: 2,
      width: 800,
      height: 600,
    });

    const hop1Nodes = layout.nodes.filter((n) => n.hop === 1);
    expect(hop1Nodes).toHaveLength(3);

    // Hop 2 should contain hop2-x and hop2-y
    const hop2Nodes = layout.nodes.filter((n) => n.hop === 2);
    expect(hop2Nodes).toHaveLength(2);
    const hop2Ids = hop2Nodes.map((n) => n.id);
    expect(hop2Ids).toContain('doc:hop2-x.md');
    expect(hop2Ids).toContain('doc:hop2-y.md');
  });

  it('filters edges and neighbors by allowed relations', () => {
    // Only allow LINKS_TO (exclude CONTAINS and REFERENCES)
    const layout = computeLocalGraphLayout(mockNodes, mockEdges, {
      centerId: 'doc:center.md',
      depth: 2,
      allowedRelations: ['LINKS_TO'],
      width: 800,
      height: 600,
    });

    // Heading intro was CONTAINS, so it should not be in Hop 1
    const hop1Ids = layout.nodes.filter((n) => n.hop === 1).map((n) => n.id);
    expect(hop1Ids).not.toContain('heading:center:intro');
    expect(hop1Ids).toContain('doc:neighbor-a.md');
    expect(hop1Ids).toContain('doc:neighbor-b.md');
  });

  it('enforces node capping deterministically and reports truncation', () => {
    const layout = computeLocalGraphLayout(mockNodes, mockEdges, {
      centerId: 'doc:center.md',
      depth: 2,
      nodeCap: 3, // only center + 2 nodes allowed
      width: 800,
      height: 600,
    });

    expect(layout.truncated).toBe(true);
    expect(layout.nodes).toHaveLength(3);
    expect(layout.totalCandidateNodes).toBe(6); // 1 center + 3 hop1 + 2 hop2
  });

  it('handles missing center node gracefully', () => {
    const layout = computeLocalGraphLayout(mockNodes, mockEdges, {
      centerId: 'doc:non-existent.md',
      depth: 1,
    });

    expect(layout.nodes).toHaveLength(0);
    expect(layout.centerNode).toBeNull();
    expect(layout.truncated).toBe(false);
  });
});
