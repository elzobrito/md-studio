import { describe, it, expect } from 'vitest';
import { findShortestPath } from '../../src/services/pathExplorer';
import type { GraphEdge, GraphNode, GraphSnapshot } from '../../src/services/knowledgeGraph';

describe('Path Explorer BFS service', () => {
  const mockNodes: GraphNode[] = [
    { id: 'doc:a.md', kind: 'document', label: 'Doc A', path: 'a.md' },
    { id: 'heading:a.md:sec', kind: 'heading', label: 'Sec', path: 'a.md' },
    { id: 'doc:b.md', kind: 'document', label: 'Doc B', path: 'b.md' },
    { id: 'doc:c.md', kind: 'document', label: 'Doc C', path: 'c.md' },
    { id: 'doc:isolated.md', kind: 'document', label: 'Isolated', path: 'isolated.md' },
  ];

  const mockEdges: GraphEdge[] = [
    // Doc A contains Heading Sec
    { from: 'doc:a.md', to: 'heading:a.md:sec', relation: 'CONTAINS' },
    // Doc B references Heading Sec
    { from: 'doc:b.md', to: 'heading:a.md:sec', relation: 'REFERENCES' },
    // Doc B links to Doc C
    { from: 'doc:b.md', to: 'doc:c.md', relation: 'LINKS_TO' },
    // Cycle: Doc C links back to Doc A
    { from: 'doc:c.md', to: 'doc:a.md', relation: 'LINKS_TO' },
  ];

  const mockSnapshot: GraphSnapshot = {
    generation: 1,
    hash: 'mock-hash',
    nodes: mockNodes,
    edges: mockEdges,
  };

  it('finds direct connection between connected nodes', () => {
    const path = findShortestPath(mockSnapshot, 'doc:b.md', 'doc:c.md');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    expect(path!.steps).toHaveLength(2);
    expect(path!.steps[0].nodeId).toBe('doc:b.md');
    expect(path!.steps[1].nodeId).toBe('doc:c.md');
  });

  it('finds multi-hop path across intermediate nodes', () => {
    // Path from Doc A to Doc B via Heading Sec
    const path = findShortestPath(mockSnapshot, 'doc:a.md', 'doc:b.md');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
    expect(path!.steps.map((s) => s.nodeId)).toEqual([
      'doc:a.md',
      'heading:a.md:sec',
      'doc:b.md',
    ]);
  });

  it('handles cycles safely and returns shortest path', () => {
    // Cycle exists: Doc C -> Doc A -> Heading Sec -> Doc B -> Doc C
    // From C to A is directly 1 hop
    const path = findShortestPath(mockSnapshot, 'doc:c.md', 'doc:a.md');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
  });

  it('returns null when no relationship path exists to disconnected node', () => {
    const path = findShortestPath(mockSnapshot, 'doc:a.md', 'doc:isolated.md');
    expect(path).toBeNull();
  });

  it('handles identical fromId and toId with 0 length', () => {
    const path = findShortestPath(mockSnapshot, 'doc:a.md', 'doc:a.md');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(0);
    expect(path!.steps).toHaveLength(1);
  });

  it('filters search by allowed edge relations', () => {
    // If only LINKS_TO is allowed, path from Doc A to Doc B must go via C: Doc A <-(LINKS_TO)- Doc C <-(LINKS_TO)- Doc B
    const path = findShortestPath(mockSnapshot, 'doc:a.md', 'doc:b.md', {
      allowedRelations: ['LINKS_TO'],
    });
    expect(path).not.toBeNull();
    expect(path!.edges.every((e) => e.relation === 'LINKS_TO')).toBe(true);
  });
});
