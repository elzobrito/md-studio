import type { EdgeRelation, GraphEdge, GraphNode, GraphSnapshot, NodeKind } from './knowledgeGraph';

export type ImpactTargetKind = 'document' | 'heading' | 'block' | 'asset';

export interface ImpactTarget {
  kind: ImpactTargetKind;
  nodeId: string;
}

export interface ImpactRelationSummary {
  relation: EdgeRelation;
  sourceNodeId: string;
  targetNodeId: string;
  targetKind: NodeKind | 'unknown';
  count: number;
}

export interface ImpactDocument {
  nodeId: string;
  path: string;
  title?: string | null;
  relationCount: number;
  occurrenceCount: number;
  relations: ImpactRelationSummary[];
}

export interface ImpactHintEvidence {
  affectedDocumentCount?: number;
  relationCount?: number;
  occurrenceCount?: number;
  targetNodeIds?: string[];
  relations?: EdgeRelation[];
}

export interface ImpactHint {
  code: string;
  message: string;
  evidence: ImpactHintEvidence;
}

export interface ImpactReport {
  target: GraphNode;
  inboundEdges: GraphEdge[];
  affectedDocuments: ImpactDocument[];
  riskHints: ImpactHint[];
}

export interface ImpactReportEnvelope {
  graphGeneration: number;
  graphHash: string;
  report: ImpactReport;
}

export interface DependencySummary {
  target: GraphNode;
  outboundEdges: GraphEdge[];
  dependencyNodes: GraphNode[];
  dependencyDocuments: GraphNode[];
}

/**
 * Computes an explainable, read-only ImpactReport for a canonical target (Document, Heading, Block, Asset).
 */
export function computeImpactReport(
  snapshot: GraphSnapshot,
  targetNodeId: string
): ImpactReport | null {
  const targetNode = snapshot.nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) {
    return null;
  }

  // Find all node IDs to inspect for inbound edges.
  // If target is a Document, include itself and any sub-nodes it contains (headings, blocks).
  const targetIds = new Set<string>([targetNodeId]);
  if (targetNode.kind === 'document') {
    for (const edge of snapshot.edges) {
      if (edge.from === targetNodeId && edge.relation === 'CONTAINS') {
        targetIds.add(edge.to);
      }
    }
  }

  // Collect all inbound edges
  const inboundEdges = snapshot.edges.filter(
    (e) => targetIds.has(e.to) && e.relation !== 'CONTAINS' && !targetIds.has(e.from)
  );

  // Group by source document
  const docMap = new Map<string, { node: GraphNode; edges: GraphEdge[] }>();
  for (const edge of inboundEdges) {
    // Resolve source document
    let srcDocNode: GraphNode | undefined;
    if (edge.from.startsWith('doc:')) {
      srcDocNode = snapshot.nodes.find((n) => n.id === edge.from);
    } else {
      // Find parent doc via CONTAINS reverse
      const parentContain = snapshot.edges.find((e) => e.to === edge.from && e.relation === 'CONTAINS');
      if (parentContain) {
        srcDocNode = snapshot.nodes.find((n) => n.id === parentContain.from);
      }
    }

    if (srcDocNode) {
      const entry = docMap.get(srcDocNode.id) || { node: srcDocNode, edges: [] };
      entry.edges.push(edge);
      docMap.set(srcDocNode.id, entry);
    }
  }

  const affectedDocuments: ImpactDocument[] = [];
  for (const [docId, { node, edges }] of docMap.entries()) {
    const relations: ImpactRelationSummary[] = [];

    for (const edge of edges) {
      const targetSub = snapshot.nodes.find((n) => n.id === edge.to);

      relations.push({
        relation: edge.relation,
        sourceNodeId: edge.from,
        targetNodeId: edge.to,
        targetKind: targetSub?.kind ?? 'unknown',
        count: 1,
      });
    }

    affectedDocuments.push({
      nodeId: docId,
      path: node.path || node.id,
      title: node.label,
      relationCount: edges.length,
      occurrenceCount: edges.length,
      relations,
    });
  }

  // Sort affected documents deterministically by path
  affectedDocuments.sort((a, b) => a.path.localeCompare(b.path));

  // Build risk hints (factual, transparent, without opaque scoring)
  const riskHints: ImpactHint[] = [];
  const totalAffected = affectedDocuments.length;
  const totalRelations = inboundEdges.length;
  const totalOccurrences = affectedDocuments.reduce((acc, d) => acc + d.occurrenceCount, 0);

  if (totalAffected > 0) {
    riskHints.push({
      code: 'HAS_INBOUND_REFERENCES',
      message: `${totalAffected} documento(s) possuem referências diretas a este item.`,
      evidence: {
        affectedDocumentCount: totalAffected,
        relationCount: totalRelations,
        occurrenceCount: totalOccurrences,
        targetNodeIds: Array.from(targetIds),
      },
    });

    if (targetNode.kind === 'document' && targetIds.size > 1) {
      const subtargetEdges = inboundEdges.filter((e) => e.to !== targetNodeId);
      if (subtargetEdges.length > 0) {
        riskHints.push({
          code: 'HAS_SUBTARGET_REFERENCES',
          message: `${subtargetEdges.length} referência(s) apontam especificamente para cabeçalhos ou blocos deste documento.`,
          evidence: {
            relationCount: subtargetEdges.length,
            targetNodeIds: Array.from(new Set(subtargetEdges.map((e) => e.to))),
          },
        });
      }
    }

    if (targetNode.kind === 'heading') {
      riskHints.push({
        code: 'REFERENCED_HEADING',
        message: 'Este cabeçalho é referenciado diretamente via âncora por outros arquivos.',
        evidence: { relationCount: totalRelations, occurrenceCount: totalOccurrences },
      });
    }

    if (targetNode.kind === 'block') {
      riskHints.push({
        code: 'REFERENCED_BLOCK',
        message: 'Este bloco é referenciado diretamente via block-id por outros arquivos.',
        evidence: { relationCount: totalRelations, occurrenceCount: totalOccurrences },
      });
    }

    if (targetNode.kind === 'asset' && totalAffected > 1) {
      riskHints.push({
        code: 'SHARED_ASSET',
        message: `Este recurso de mídia é compartilhado por ${totalAffected} documentos.`,
        evidence: { affectedDocumentCount: totalAffected },
      });
    }
  } else {
    riskHints.push({
      code: 'NO_INBOUND_REFERENCES',
      message: 'Nenhuma dependência inbound conhecida foi encontrada no Knowledge Graph.',
      evidence: { affectedDocumentCount: 0, relationCount: 0 },
    });
  }

  return {
    target: targetNode,
    inboundEdges,
    affectedDocuments,
    riskHints,
  };
}

/**
 * Computes an outbound DependencySummary for a target node.
 */
export function computeDependencySummary(
  snapshot: GraphSnapshot,
  targetNodeId: string
): DependencySummary | null {
  const targetNode = snapshot.nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) return null;

  const outboundEdges = snapshot.edges.filter(
    (e) => e.from === targetNodeId && e.relation !== 'CONTAINS'
  );

  const dependencyNodeIds = new Set(outboundEdges.map((e) => e.to));
  const dependencyNodes = snapshot.nodes.filter((n) => dependencyNodeIds.has(n.id));

  const dependencyDocs = new Set<GraphNode>();
  for (const node of dependencyNodes) {
    if (node.kind === 'document') {
      dependencyDocs.add(node);
    } else {
      const parentContain = snapshot.edges.find((e) => e.to === node.id && e.relation === 'CONTAINS');
      if (parentContain) {
        const parentDoc = snapshot.nodes.find((n) => n.id === parentContain.from);
        if (parentDoc) dependencyDocs.add(parentDoc);
      }
    }
  }

  return {
    target: targetNode,
    outboundEdges,
    dependencyNodes,
    dependencyDocuments: Array.from(dependencyDocs).sort((a, b) => (a.path || '').localeCompare(b.path || '')),
  };
}
