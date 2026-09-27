import type { EdgeRelation, GraphEdge, GraphNode, NodeKind } from './knowledgeGraph';

export interface LayoutPositionedNode {
  id: string;
  kind: NodeKind;
  label: string;
  path?: string;
  hop: number;
  x: number;
  y: number;
  radius: number;
}

export interface LayoutPositionedEdge {
  from: string;
  to: string;
  relation: EdgeRelation;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LocalGraphLayoutResult {
  nodes: LayoutPositionedNode[];
  edges: LayoutPositionedEdge[];
  centerNode: LayoutPositionedNode | null;
  truncated: boolean;
  totalCandidateNodes: number;
}

export interface LocalGraphLayoutOptions {
  centerId: string;
  depth?: number; // 1 or 2
  allowedRelations?: EdgeRelation[];
  width?: number;
  height?: number;
  nodeCap?: number; // default 60 for 1 hop, 120 for 2 hops
}

/**
 * Computes deterministic concentric radial layout for local graph (1-2 hops).
 * Guaranteed O(N) trigonometric distribution, 0 jitter, 100% offline.
 */
export function computeLocalGraphLayout(
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  options: LocalGraphLayoutOptions
): LocalGraphLayoutResult {
  const depth = options.depth ?? 1;
  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const maxCap = options.nodeCap ?? (depth === 1 ? 60 : 120);
  const allowedRelations = options.allowedRelations
    ? new Set(options.allowedRelations)
    : new Set<EdgeRelation>(['CONTAINS', 'LINKS_TO', 'REFERENCES', 'USES', 'TAGGED_AS']);

  const cx = width / 2;
  const cy = height / 2;
  const nodeMap = new Map<string, GraphNode>(allNodes.map((n) => [n.id, n]));
  const centerNodeData = nodeMap.get(options.centerId);

  if (!centerNodeData) {
    return {
      nodes: [],
      edges: [],
      centerNode: null,
      truncated: false,
      totalCandidateNodes: 0,
    };
  }

  // Filter edges by allowed relations
  const validEdges = allEdges.filter((e) => allowedRelations.has(e.relation));

  // Find Hop 1 neighbors
  const hop1Neighbors = new Set<string>();
  for (const edge of validEdges) {
    if (edge.from === options.centerId) {
      hop1Neighbors.add(edge.to);
    } else if (edge.to === options.centerId) {
      hop1Neighbors.add(edge.from);
    }
  }

  // Find Hop 2 neighbors (if depth === 2)
  const hop2Neighbors = new Set<string>();
  if (depth >= 2) {
    for (const edge of validEdges) {
      if (hop1Neighbors.has(edge.from) && edge.to !== options.centerId && !hop1Neighbors.has(edge.to)) {
        hop2Neighbors.add(edge.to);
      } else if (hop1Neighbors.has(edge.to) && edge.from !== options.centerId && !hop1Neighbors.has(edge.from)) {
        hop2Neighbors.add(edge.from);
      }
    }
  }

  const totalCandidateNodes = 1 + hop1Neighbors.size + hop2Neighbors.size;
  let truncated = false;

  // Enforce deterministic capping
  const hop1List = Array.from(hop1Neighbors).sort();
  const hop2List = Array.from(hop2Neighbors).sort();

  let finalHop1 = hop1List;
  let finalHop2 = hop2List;

  if (1 + finalHop1.length + finalHop2.length > maxCap) {
    truncated = true;
    const remainingForHop1 = Math.min(finalHop1.length, maxCap - 1);
    finalHop1 = finalHop1.slice(0, remainingForHop1);
    const remainingForHop2 = Math.max(0, maxCap - 1 - finalHop1.length);
    finalHop2 = finalHop2.slice(0, remainingForHop2);
  }

  const positionedNodes: LayoutPositionedNode[] = [];
  const nodePosMap = new Map<string, LayoutPositionedNode>();

  // Center node (Hop 0)
  const centerPositioned: LayoutPositionedNode = {
    id: centerNodeData.id,
    kind: centerNodeData.kind,
    label: centerNodeData.label,
    path: centerNodeData.path,
    hop: 0,
    x: cx,
    y: cy,
    radius: 18,
  };
  positionedNodes.push(centerPositioned);
  nodePosMap.set(centerPositioned.id, centerPositioned);

  // Hop 1 Ring
  const r1 = Math.min(width, height) * 0.28;
  const count1 = finalHop1.length;
  for (let i = 0; i < count1; i++) {
    const id = finalHop1[i];
    const data = nodeMap.get(id);
    if (!data) continue;

    const angle = (2 * Math.PI * i) / count1 - Math.PI / 2;
    const x = cx + r1 * Math.cos(angle);
    const y = cy + r1 * Math.sin(angle);

    const posNode: LayoutPositionedNode = {
      id: data.id,
      kind: data.kind,
      label: data.label,
      path: data.path,
      hop: 1,
      x,
      y,
      radius: 12,
    };
    positionedNodes.push(posNode);
    nodePosMap.set(id, posNode);
  }

  // Hop 2 Ring
  if (depth >= 2) {
    const r2 = Math.min(width, height) * 0.44;
    const count2 = finalHop2.length;
    for (let i = 0; i < count2; i++) {
      const id = finalHop2[i];
      const data = nodeMap.get(id);
      if (!data) continue;

      const angle = (2 * Math.PI * i) / count2 - Math.PI / 2 + Math.PI / count2;
      const x = cx + r2 * Math.cos(angle);
      const y = cy + r2 * Math.sin(angle);

      const posNode: LayoutPositionedNode = {
        id: data.id,
        kind: data.kind,
        label: data.label,
        path: data.path,
        hop: 2,
        x,
        y,
        radius: 9,
      };
      positionedNodes.push(posNode);
      nodePosMap.set(id, posNode);
    }
  }

  // Filter edges between positioned nodes
  const positionedEdges: LayoutPositionedEdge[] = [];
  for (const edge of validEdges) {
    const fromNode = nodePosMap.get(edge.from);
    const toNode = nodePosMap.get(edge.to);
    if (fromNode && toNode) {
      positionedEdges.push({
        from: edge.from,
        to: edge.to,
        relation: edge.relation,
        x1: fromNode.x,
        y1: fromNode.y,
        x2: toNode.x,
        y2: toNode.y,
      });
    }
  }

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    centerNode: centerPositioned,
    truncated,
    totalCandidateNodes,
  };
}
