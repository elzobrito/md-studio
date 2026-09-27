import type { GraphSnapshot, GraphNode, NodeKind } from "./knowledgeGraph";

export type PredicateType =
  | "references_doc"
  | "no_backlinks"
  | "is_orphan"
  | "uses_asset"
  | "in_folder"
  | "points_to_heading"
  | "has_tag"
  | "has_unresolved_links";

export interface StructuralPredicate {
  type: PredicateType;
  value?: string;
  negate?: boolean;
}

export interface StructuralQuery {
  combinator: "AND" | "OR";
  predicates: StructuralPredicate[];
  limit?: number;
  offset?: number;
}

export interface MatchedResultItem {
  id: string;
  kind: NodeKind;
  label: string;
  path?: string;
  matchedReasons: string[];
}

export interface StructuralSearchResult {
  items: MatchedResultItem[];
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  executionTimeMs: number;
}

export interface StructuralSearchPreset {
  id: string;
  label: string;
  description: string;
  query: StructuralQuery;
}

export const STRUCTURAL_SEARCH_PRESETS: StructuralSearchPreset[] = [
  {
    id: "orphans",
    label: "Órfãos (Sem links de entrada)",
    description: "Documentos sem nenhum backlink",
    query: {
      combinator: "AND",
      predicates: [{ type: "no_backlinks" }],
      limit: 50,
      offset: 0,
    },
  },
  {
    id: "completely_isolated",
    label: "Totalmente Isolados",
    description: "Documentos sem backlinks e sem links de saída",
    query: {
      combinator: "AND",
      predicates: [{ type: "is_orphan" }],
      limit: 50,
      offset: 0,
    },
  },
  {
    id: "unresolved",
    label: "Links Não Resolvidos",
    description: "Documentos com links para placeholders inexistentes",
    query: {
      combinator: "AND",
      predicates: [{ type: "has_unresolved_links" }],
      limit: 50,
      offset: 0,
    },
  },
];

/**
 * Normaliza caminhos para separador `/` e lowercase
 */
function normalize(str: string): string {
  return str.replace(/\\/g, "/").trim().toLocaleLowerCase();
}

/**
 * Constrói índices auxiliares em memória para permitir buscas estruturais O(1)/O(E) rápidas
 */
export class GraphQueryIndex {
  private inLinks = new Map<string, string[]>(); // targetId -> [sourceId]
  private outLinks = new Map<string, string[]>(); // sourceId -> [targetId]
  private docToAssets = new Map<string, Set<string>>(); // docId -> Set(assetName)
  private docToTags = new Map<string, Set<string>>(); // docId -> Set(tag)
  private docToHeadings = new Map<string, Set<string>>(); // docId -> Set(headingAnchor/text)
  private docToPlaceholders = new Map<string, Set<string>>(); // docId -> Set(placeholder)
  private nodesById = new Map<string, GraphNode>();
  private docNodes: GraphNode[] = [];

  constructor(private snapshot: GraphSnapshot) {
    for (const node of snapshot.nodes) {
      this.nodesById.set(node.id, node);
      if (node.kind === "document") {
        this.docNodes.push(node);
      }
    }

    for (const edge of snapshot.edges) {
      // Inbound index
      if (!this.inLinks.has(edge.to)) {
        this.inLinks.set(edge.to, []);
      }
      this.inLinks.get(edge.to)!.push(edge.from);

      // Outbound index
      if (!this.outLinks.has(edge.from)) {
        this.outLinks.set(edge.from, []);
      }
      this.outLinks.get(edge.from)!.push(edge.to);

      // Category indexing
      if (edge.relation === "USES") {
        if (!this.docToAssets.has(edge.from)) this.docToAssets.set(edge.from, new Set());
        const assetNode = this.nodesById.get(edge.to);
        const assetLabel = assetNode?.label || edge.to.replace(/^asset:/, "");
        this.docToAssets.get(edge.from)!.add(normalize(assetLabel));
      } else if (edge.relation === "TAGGED_AS") {
        if (!this.docToTags.has(edge.from)) this.docToTags.set(edge.from, new Set());
        const tagLabel = edge.to.replace(/^tag:/, "").toLocaleLowerCase();
        this.docToTags.get(edge.from)!.add(tagLabel);
      } else if (edge.relation === "REFERENCES" && edge.to.startsWith("heading:")) {
        if (!this.docToHeadings.has(edge.from)) this.docToHeadings.set(edge.from, new Set());
        const headingPart = edge.to.slice("heading:".length);
        this.docToHeadings.get(edge.from)!.add(normalize(headingPart));
        const headingNode = this.nodesById.get(edge.to);
        if (headingNode?.label) {
          this.docToHeadings.get(edge.from)!.add(normalize(headingNode.label));
        }
      } else if (edge.to.startsWith("placeholder:")) {
        if (!this.docToPlaceholders.has(edge.from)) this.docToPlaceholders.set(edge.from, new Set());
        this.docToPlaceholders.get(edge.from)!.add(normalize(edge.to.slice("placeholder:".length)));
      }
    }
  }

  getDocNodes(): GraphNode[] {
    return this.docNodes;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodesById.get(id);
  }

  getInboundLinks(id: string): string[] {
    return this.inLinks.get(id) || [];
  }

  getOutboundLinks(id: string): string[] {
    return this.outLinks.get(id) || [];
  }

  testPredicate(docNode: GraphNode, predicate: StructuralPredicate): { matches: boolean; reason?: string } {
    const docId = docNode.id;
    const docPath = docNode.path || "";
    const normDocPath = normalize(docPath);
    let matched = false;
    let reason = "";

    switch (predicate.type) {
      case "references_doc": {
        const targetVal = normalize(predicate.value || "");
        if (!targetVal) return { matches: false };
        const outbound = this.getOutboundLinks(docId);
        for (const outId of outbound) {
          if (outId.startsWith("doc:")) {
            const outPath = normalize(outId.slice(4));
            if (outPath === targetVal || outPath.includes(targetVal)) {
              matched = true;
              reason = `Referencia '${predicate.value}'`;
              break;
            }
          }
        }
        break;
      }

      case "no_backlinks": {
        const inbound = this.getInboundLinks(docId).filter((id) => id.startsWith("doc:"));
        if (inbound.length === 0) {
          matched = true;
          reason = "Sem backlinks de entrada";
        }
        break;
      }

      case "is_orphan": {
        const inbound = this.getInboundLinks(docId).filter((id) => id.startsWith("doc:"));
        const outbound = this.getOutboundLinks(docId).filter((id) => id.startsWith("doc:"));
        if (inbound.length === 0 && outbound.length === 0) {
          matched = true;
          reason = "Nó isolado (0 links de entrada e 0 links de saída)";
        }
        break;
      }

      case "uses_asset": {
        const targetVal = normalize(predicate.value || "");
        if (!targetVal) return { matches: false };
        const assets = this.docToAssets.get(docId);
        if (assets) {
          for (const asset of assets) {
            if (asset === targetVal || asset.includes(targetVal)) {
              matched = true;
              reason = `Utiliza asset '${predicate.value}'`;
              break;
            }
          }
        }
        break;
      }

      case "in_folder": {
        const folderVal = normalize(predicate.value || "");
        if (!folderVal) return { matches: false };
        const cleanFolder = folderVal.endsWith("/") ? folderVal : `${folderVal}/`;
        if (normDocPath.startsWith(cleanFolder) || normDocPath.startsWith(folderVal)) {
          matched = true;
          reason = `Localizado na pasta '${predicate.value}'`;
        }
        break;
      }

      case "points_to_heading": {
        const headingVal = normalize(predicate.value || "");
        if (!headingVal) return { matches: false };
        const headings = this.docToHeadings.get(docId);
        if (headings) {
          for (const h of headings) {
            if (h === headingVal || h.includes(headingVal)) {
              matched = true;
              reason = `Aponta para heading contendo '${predicate.value}'`;
              break;
            }
          }
        }
        break;
      }

      case "has_tag": {
        const tagVal = normalize((predicate.value || "").replace(/^#/, ""));
        if (!tagVal) return { matches: false };
        const tags = this.docToTags.get(docId);
        if (tags && tags.has(tagVal)) {
          matched = true;
          reason = `Possui tag #${predicate.value?.replace(/^#/, "")}`;
        }
        break;
      }

      case "has_unresolved_links": {
        const placeholders = this.docToPlaceholders.get(docId);
        if (placeholders && placeholders.size > 0) {
          matched = true;
          reason = `Possui ${placeholders.size} link(s) não resolvido(s)`;
        }
        break;
      }
    }

    if (predicate.negate) {
      matched = !matched;
      reason = matched ? `Não (${reason || predicate.type})` : "";
    }

    return { matches: matched, reason: matched ? reason : undefined };
  }
}

/**
 * Executa a consulta estrutural de forma segura e assíncrona, suportando cancelamento por AbortSignal.
 */
export async function executeStructuralQuery(
  snapshot: GraphSnapshot,
  query: StructuralQuery,
  signal?: AbortSignal,
): Promise<StructuralSearchResult> {
  const startTime = Date.now();
  const index = new GraphQueryIndex(snapshot);
  const docNodes = index.getDocNodes();

  const matchedItems: MatchedResultItem[] = [];

  const combinator = query.combinator || "AND";
  const predicates = query.predicates || [];

  if (predicates.length === 0) {
    return {
      items: [],
      totalCount: 0,
      offset: 0,
      limit: query.limit || 50,
      hasMore: false,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Iteração com verificação de abort para queries grandes
  for (let i = 0; i < docNodes.length; i++) {
    if (signal?.aborted) {
      throw new DOMException("Structural search query aborted", "AbortError");
    }

    // A cada 100 documentos, cede o controle ao event loop para não bloquear UI
    if (i > 0 && i % 100 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const doc = docNodes[i];
    const reasons: string[] = [];

    let docMatches = false;

    if (combinator === "AND") {
      let allMatch = true;
      for (const pred of predicates) {
        const testRes = index.testPredicate(doc, pred);
        if (!testRes.matches) {
          allMatch = false;
          break;
        }
        if (testRes.reason) reasons.push(testRes.reason);
      }
      docMatches = allMatch;
    } else {
      // OR
      let anyMatch = false;
      for (const pred of predicates) {
        const testRes = index.testPredicate(doc, pred);
        if (testRes.matches) {
          anyMatch = true;
          if (testRes.reason) reasons.push(testRes.reason);
        }
      }
      docMatches = anyMatch;
    }

    if (docMatches) {
      matchedItems.push({
        id: doc.id,
        kind: doc.kind,
        label: doc.label,
        path: doc.path,
        matchedReasons: reasons,
      });
    }
  }

  const offset = query.offset || 0;
  const limit = query.limit || 50;
  const paginatedItems = matchedItems.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    totalCount: matchedItems.length,
    offset,
    limit,
    hasMore: offset + limit < matchedItems.length,
    executionTimeMs: Date.now() - startTime,
  };
}
