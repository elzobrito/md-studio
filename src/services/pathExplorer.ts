import type { EdgeRelation, GraphEdge, GraphNode, GraphSnapshot, NodeKind } from './knowledgeGraph';

export interface PathStep {
  nodeId: string;
  kind: NodeKind;
  label: string;
  path?: string;
  edgeToNext?: {
    relation: EdgeRelation;
    direction: 'forward' | 'backward';
  };
}

export interface ExploredPath {
  fromId: string;
  toId: string;
  length: number;
  steps: PathStep[];
  edges: GraphEdge[];
}

export interface PathSearchOptions {
  maxDepth?: number; // default 6
  allowedRelations?: EdgeRelation[];
  directedOnly?: boolean; // default false (finds structural connection in either direction)
}

/**
 * Finds the shortest relationship path between two nodes in the Knowledge Graph using BFS.
 * Guaranteed deterministic, cycle-safe, depth-limited and explainable.
 */
export function findShortestPath(
  snapshot: GraphSnapshot,
  fromId: string,
  toId: string,
  options: PathSearchOptions = {}
): ExploredPath | null {
  if (fromId === toId) {
    const node = snapshot.nodes.find((n) => n.id === fromId);
    if (!node) return null;
    return {
      fromId,
      toId,
      length: 0,
      steps: [
        {
          nodeId: node.id,
          kind: node.kind,
          label: node.label,
          path: node.path,
        },
      ],
      edges: [],
    };
  }

  const nodeMap = new Map<string, GraphNode>(snapshot.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(fromId) || !nodeMap.has(toId)) {
    return null;
  }

  const maxDepth = options.maxDepth ?? 6;
  const directedOnly = options.directedOnly ?? false;
  const allowed = options.allowedRelations
    ? new Set(options.allowedRelations)
    : new Set<EdgeRelation>(['CONTAINS', 'LINKS_TO', 'REFERENCES', 'USES', 'TAGGED_AS']);

  // Build adjacency list
  const adj = new Map<string, Array<{ target: string; edge: GraphEdge; direction: 'forward' | 'backward' }>>();
  for (const edge of snapshot.edges) {
    if (!allowed.has(edge.relation)) continue;

    // Forward
    const fList = adj.get(edge.from) || [];
    fList.push({ target: edge.to, edge, direction: 'forward' });
    adj.set(edge.from, fList);

    // Backward (if not directedOnly)
    if (!directedOnly) {
      const bList = adj.get(edge.to) || [];
      bList.push({ target: edge.from, edge, direction: 'backward' });
      adj.set(edge.to, bList);
    }
  }

  // BFS Queue: [currentNodeId, currentSteps, currentEdges]
  interface QueueItem {
    id: string;
    steps: Array<{ nodeId: string; edgeToNext?: { relation: EdgeRelation; direction: 'forward' | 'backward' } }>;
    edges: GraphEdge[];
    depth: number;
  }

  const queue: QueueItem[] = [
    {
      id: fromId,
      steps: [{ nodeId: fromId }],
      edges: [],
      depth: 0,
    },
  ];

  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === toId) {
      // Reconstruct full steps with node metadata
      const fullSteps: PathStep[] = current.steps.map((st) => {
        const nd = nodeMap.get(st.nodeId)!;
        return {
          nodeId: nd.id,
          kind: nd.kind,
          label: nd.label,
          path: nd.path,
          edgeToNext: st.edgeToNext,
        };
      });

      return {
        fromId,
        toId,
        length: current.edges.length,
        steps: fullSteps,
        edges: current.edges,
      };
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    const neighbors = adj.get(current.id) || [];
    for (const { target, edge, direction } of neighbors) {
      if (!visited.has(target)) {
        visited.add(target);

        // Update the last step of the current path to record edgeToNext
        const updatedSteps = [...current.steps];
        updatedSteps[updatedSteps.length - 1] = {
          ...updatedSteps[updatedSteps.length - 1],
          edgeToNext: { relation: edge.relation, direction },
        };
        updatedSteps.push({ nodeId: target });

        queue.push({
          id: target,
          steps: updatedSteps,
          edges: [...current.edges, edge],
          depth: current.depth + 1,
        });
      }
    }
  }

  return null;
}
