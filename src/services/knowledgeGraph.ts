export type NodeKind = "document" | "heading" | "block" | "asset" | "tag" | "placeholder";

export type EdgeRelation = "CONTAINS" | "LINKS_TO" | "REFERENCES" | "USES" | "TAGGED_AS";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  path?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: EdgeRelation;
}

export interface GraphSnapshot {
  generation: number;
  hash: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SubgraphResult {
  centerId: string;
  depth: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

export interface RelationshipPath {
  from: string;
  to: string;
  steps: string[];
  edges: GraphEdge[];
  length: number;
}

export interface ImpactReport {
  targetId: string;
  inboundCount: usizeOrNumber;
  directlyAffectedDocuments: string[];
  inboundEdges: GraphEdge[];
}

type usizeOrNumber = number;

export interface DocumentMetadataInput {
  path: string;
  title?: string | null;
  headings?: Array<{ depth: number; text: string; anchor: string }>;
  blocks?: Array<{ id: string; snippet?: string }>;
  wikiLinks?: Array<{ target: string; alias?: string | null }>;
  tags?: string[];
  images?: string[];
}

export function buildLocalKnowledgeGraph(
  documents: readonly DocumentMetadataInput[],
  placeholders: readonly string[] = [],
): GraphSnapshot {
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Map<string, GraphEdge>();
  const placeholderSet = new Set(placeholders.map((p) => p.trim().toLocaleLowerCase()));

  const docPathMap = new Map<string, string>(); // stem/title/path -> normalized path
  for (const doc of documents) {
    const norm = doc.path.replace(/\\/g, "/");
    docPathMap.set(norm.toLocaleLowerCase(), norm);
    const stem = norm.split("/").pop()?.replace(/\.md$/i, "") || norm;
    docPathMap.set(stem.toLocaleLowerCase(), norm);
    if (doc.title) {
      docPathMap.set(doc.title.trim().toLocaleLowerCase(), norm);
    }
  }

  for (const doc of documents) {
    const normPath = doc.path.replace(/\\/g, "/");
    const docId = `doc:${normPath}`;
    const docLabel = doc.title?.trim() || normPath.split("/").pop() || normPath;

    nodeMap.set(docId, { id: docId, kind: "document", label: docLabel, path: normPath });

    // Headings
    for (const h of doc.headings ?? []) {
      const headingId = `heading:${normPath}#${h.anchor}`;
      nodeMap.set(headingId, { id: headingId, kind: "heading", label: h.text, path: normPath });
      const edgeKey = `${docId}->${headingId}:CONTAINS`;
      edgeSet.set(edgeKey, { from: docId, to: headingId, relation: "CONTAINS" });
    }

    // Blocks
    for (const b of doc.blocks ?? []) {
      const blockId = `block:${normPath}#^${b.id}`;
      nodeMap.set(blockId, { id: blockId, kind: "block", label: `^${b.id}`, path: normPath });
      const edgeKey = `${docId}->${blockId}:CONTAINS`;
      edgeSet.set(edgeKey, { from: docId, to: blockId, relation: "CONTAINS" });
    }

    // Tags
    for (const t of doc.tags ?? []) {
      const clean = t.replace(/^#/, "");
      const tagId = `tag:${clean.toLocaleLowerCase()}`;
      nodeMap.set(tagId, { id: tagId, kind: "tag", label: `#${clean}` });
      const edgeKey = `${docId}->${tagId}:TAGGED_AS`;
      edgeSet.set(edgeKey, { from: docId, to: tagId, relation: "TAGGED_AS" });
    }

    // Images / Assets
    for (const img of doc.images ?? []) {
      const assetNorm = img.replace(/\\/g, "/");
      const assetId = `asset:${assetNorm}`;
      nodeMap.set(assetId, { id: assetId, kind: "asset", label: assetNorm, path: assetNorm });
      const edgeKey = `${docId}->${assetId}:USES`;
      edgeSet.set(edgeKey, { from: docId, to: assetId, relation: "USES" });
    }

    // Wiki Links
    for (const w of doc.wikiLinks ?? []) {
      const target = w.target.trim();
      if (target.includes("#^")) {
        const [docPart, blockPart] = target.split("#^");
        const resolvedPath = docPart.trim() ? docPathMap.get(docPart.trim().toLocaleLowerCase()) : normPath;
        if (resolvedPath) {
          const targetBlockId = `block:${resolvedPath}#^${blockPart.trim()}`;
          if (!nodeMap.has(targetBlockId)) {
            nodeMap.set(targetBlockId, { id: targetBlockId, kind: "block", label: `^${blockPart.trim()}`, path: resolvedPath });
          }
          const edgeKey = `${docId}->${targetBlockId}:REFERENCES`;
          edgeSet.set(edgeKey, { from: docId, to: targetBlockId, relation: "REFERENCES" });
        }
      } else if (target.includes("#")) {
        const [docPart, ...rest] = target.split("#");
        const headingPart = rest.join("#").trim();
        const resolvedPath = docPart.trim() ? docPathMap.get(docPart.trim().toLocaleLowerCase()) : normPath;
        if (resolvedPath) {
          const anchor = headingPart.toLocaleLowerCase().replace(/\s+/g, "-");
          const targetHeadingId = `heading:${resolvedPath}#${anchor}`;
          if (!nodeMap.has(targetHeadingId)) {
            nodeMap.set(targetHeadingId, { id: targetHeadingId, kind: "heading", label: headingPart, path: resolvedPath });
          }
          const edgeKey = `${docId}->${targetHeadingId}:REFERENCES`;
          edgeSet.set(edgeKey, { from: docId, to: targetHeadingId, relation: "REFERENCES" });
        }
      } else {
        const resolvedPath = docPathMap.get(target.toLocaleLowerCase());
        if (resolvedPath) {
          const targetDocId = `doc:${resolvedPath}`;
          const edgeKey = `${docId}->${targetDocId}:LINKS_TO`;
          edgeSet.set(edgeKey, { from: docId, to: targetDocId, relation: "LINKS_TO" });
        } else if (placeholderSet.has(target.toLocaleLowerCase())) {
          const placeholderId = `placeholder:${target.toLocaleLowerCase()}`;
          nodeMap.set(placeholderId, { id: placeholderId, kind: "placeholder", label: target });
          const edgeKey = `${docId}->${placeholderId}:REFERENCES`;
          edgeSet.set(edgeKey, { from: docId, to: placeholderId, relation: "REFERENCES" });
        }
      }
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const edges = Array.from(edgeSet.values()).sort((a, b) => `${a.from}->${a.to}`.localeCompare(`${b.from}->${b.to}`));

  // Generate deterministic hash
  let hashVal = 0;
  for (const n of nodes) {
    for (let i = 0; i < n.id.length; i++) hashVal = (hashVal * 31 + n.id.charCodeAt(i)) >>> 0;
  }
  for (const e of edges) {
    const s = `${e.from}->${e.to}:${e.relation}`;
    for (let i = 0; i < s.length; i++) hashVal = (hashVal * 31 + s.charCodeAt(i)) >>> 0;
  }

  return {
    generation: Date.now(),
    hash: hashVal.toString(16),
    nodes,
    edges,
  };
}

export function queryLocalSubgraph(
  snapshot: GraphSnapshot,
  centerId: string,
  depth = 1,
  nodeCap = 60,
): SubgraphResult {
  const nodeMap = new Map(snapshot.nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const collectedEdges = new Map<string, GraphEdge>();
  const queue: Array<[string, number]> = [];

  if (nodeMap.has(centerId)) {
    visited.add(centerId);
    queue.push([centerId, 0]);
  }

  let truncated = false;

  while (queue.length > 0) {
    const [currentId, currentDepth] = queue.shift()!;
    if (currentDepth >= depth) continue;

    for (const edge of snapshot.edges) {
      const neighbor = edge.from === currentId ? edge.to : edge.to === currentId ? edge.from : null;
      if (!neighbor) continue;

      if (visited.size >= nodeCap && !visited.has(neighbor)) {
        truncated = true;
        continue;
      }

      collectedEdges.set(`${edge.from}->${edge.to}:${edge.relation}`, edge);
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, currentDepth + 1]);
      }
    }
  }

  const nodes = Array.from(visited)
    .map((id) => nodeMap.get(id)!)
    .filter(Boolean);

  return {
    centerId,
    depth,
    nodes,
    edges: Array.from(collectedEdges.values()),
    truncated,
  };
}

export function computeLocalImpact(snapshot: GraphSnapshot, targetId: string): ImpactReport {
  const inboundEdges = snapshot.edges.filter((e) => e.to === targetId);
  const docSet = new Set<string>();

  for (const edge of inboundEdges) {
    if (edge.from.startsWith("doc:")) {
      docSet.add(edge.from.slice(4));
    }
  }

  return {
    targetId,
    inboundCount: inboundEdges.length,
    directlyAffectedDocuments: Array.from(docSet).sort(),
    inboundEdges,
  };
}
