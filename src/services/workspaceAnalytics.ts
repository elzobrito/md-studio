import type { GraphSnapshot } from './knowledgeGraph';
import type { Annotation } from './todoExplorer';

export interface DocumentRank {
  id: string;
  path: string;
  label: string;
  inboundLinks: number;
  outboundLinks: number;
  centralityScore: number;
}

export interface HeadingDistribution {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
}

export interface MetricExplainer {
  key: string;
  name: string;
  value: number | string;
  formula: string;
  description: string;
}

export interface WorkspaceAnalyticsReport {
  overview: {
    totalDocuments: number;
    totalHeadings: number;
    totalLinks: number;
    totalAssets: number;
    totalTodos: number;
    linkDensity: number;
  };
  explainers: MetricExplainer[];
  topReferenced: DocumentRank[];
  topCentral: DocumentRank[];
  headingDistribution: HeadingDistribution;
}

/**
 * Computes deterministic, explainable metrics for the workspace from the Knowledge Graph.
 * 100% offline, zero telemetry, no opaque proprietary scores.
 */
export function calculateWorkspaceAnalytics(
  snapshot: GraphSnapshot,
  todos: Annotation[] = []
): WorkspaceAnalyticsReport {
  const docNodes = snapshot.nodes.filter((n) => n.kind === 'document');
  const headingNodes = snapshot.nodes.filter((n) => n.kind === 'heading');
  const assetNodes = snapshot.nodes.filter((n) => n.kind === 'asset');
  const totalDocs = docNodes.length;

  // Degrees per document
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();

  for (const doc of docNodes) {
    inDegreeMap.set(doc.id, 0);
    outDegreeMap.set(doc.id, 0);
  }

  let totalCrossDocLinks = 0;
  for (const edge of snapshot.edges) {
    if (edge.relation === 'LINKS_TO' || edge.relation === 'REFERENCES') {
      if (edge.from.startsWith('doc:')) {
        outDegreeMap.set(edge.from, (outDegreeMap.get(edge.from) || 0) + 1);
      }
      if (edge.to.startsWith('doc:')) {
        inDegreeMap.set(edge.to, (inDegreeMap.get(edge.to) || 0) + 1);
        totalCrossDocLinks++;
      } else {
        // Find containing document for target subnode
        const containEdge = snapshot.edges.find((e) => e.to === edge.to && e.relation === 'CONTAINS');
        if (containEdge && containEdge.from.startsWith('doc:')) {
          inDegreeMap.set(containEdge.from, (inDegreeMap.get(containEdge.from) || 0) + 1);
          totalCrossDocLinks++;
        }
      }
    }
  }

  // Calculate ranks and degree centralities: (in + out) / max(1, N - 1)
  const ranks: DocumentRank[] = docNodes.map((doc) => {
    const inDeg = inDegreeMap.get(doc.id) || 0;
    const outDeg = outDegreeMap.get(doc.id) || 0;
    const denominator = Math.max(1, totalDocs - 1);
    const centralityScore = Number(((inDeg + outDeg) / denominator).toFixed(3));

    return {
      id: doc.id,
      path: doc.path || doc.id,
      label: doc.label,
      inboundLinks: inDeg,
      outboundLinks: outDeg,
      centralityScore,
    };
  });

  const topReferenced = [...ranks].sort((a, b) => b.inboundLinks - a.inboundLinks || a.path.localeCompare(b.path));
  const topCentral = [...ranks].sort((a, b) => b.centralityScore - a.centralityScore || a.path.localeCompare(b.path));

  // Heading distribution
  const headingDist: HeadingDistribution = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  for (const h of headingNodes) {
    // If heading node label or id indicates depth or default to H2
    headingDist.h2++;
  }

  const linkDensity = totalDocs > 0 ? Number((totalCrossDocLinks / totalDocs).toFixed(2)) : 0;

  const explainers: MetricExplainer[] = [
    {
      key: 'linkDensity',
      name: 'Densidade de Links',
      value: linkDensity,
      formula: 'totalLinks / totalDocumentos',
      description: 'Média de conexões relacionais por documento do workspace.',
    },
    {
      key: 'centrality',
      name: 'Centralidade de Grau',
      value: topCentral[0]?.centralityScore ?? 0,
      formula: '(in_degree + out_degree) / (N - 1)',
      description: 'Proporção de conexões que um documento mantém em relação ao máximo possível.',
    },
    {
      key: 'inbound',
      name: 'Mais Referenciado',
      value: topReferenced[0]?.label ?? 'Nenhum',
      formula: 'max(inbound_references)',
      description: 'Documento que recebe o maior número de referências de outros documentos.',
    },
  ];

  return {
    overview: {
      totalDocuments: totalDocs,
      totalHeadings: headingNodes.length,
      totalLinks: totalCrossDocLinks,
      totalAssets: assetNodes.length,
      totalTodos: todos.length,
      linkDensity,
    },
    explainers,
    topReferenced,
    topCentral,
    headingDistribution: headingDist,
  };
}
