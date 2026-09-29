/**
 * mermaidExplorer.ts - Mermaid Explorer service
 * Conforme especificação 051-mermaid-explorer.md
 *
 * Regras:
 * - Source Markdown é a verdade; MetadataIndex é descoberta/posição
 * - Renderer Mermaid existente (mermaid.ts) permanece canônico
 * - Export SVG/PNG existente (diagramExport.ts) é reutilizado
 * - Status de render é runtime/transitório, nunca persistido no índice
 * - Explorer não duplica renderer nem cria segundo pipeline de export
 * - 100% offline, local-first, zero chamadas de rede
 */

// ---------------------------------------------------------------------------
// Data model (Spec §42-§50)
// ---------------------------------------------------------------------------

/**
 * Persistent/deterministic record extracted from Markdown source.
 * Does NOT include render status — that lives in runtime state only.
 */
export interface DiagramIndexRecord {
  /** Workspace-relative file path */
  path: string;
  /** Stable block identity: `<path>:mermaid-<ordinal>` */
  blockId: string;
  /** 1-indexed start line of the mermaid fence */
  line: number;
  /** 1-indexed end line (closing fence) */
  endLine: number;
  /** Ordinal within the document (0-based) */
  ordinal: number;
  /** Detected diagram type from first token (flowchart, sequenceDiagram, etc.) or null */
  type: string | null;
  /** Hash of trimmed source for change detection */
  sourceHash: string;
  /** Raw source of the mermaid block */
  source: string;
}

/** Runtime render status — never persisted in MetadataIndex (§44) */
export type DiagramRenderStatus =
  | "unrendered"
  | "rendering"
  | "rendered"
  | "invalid"
  | "error";

/** Combined view/query record for UI (§43) */
export interface DiagramRecord extends DiagramIndexRecord {
  status: DiagramRenderStatus;
  /** Cached SVG when status === 'rendered' */
  svgContent?: string;
  /** Error message when status === 'invalid' | 'error' */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple hash of a string for change detection */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Detect diagram type from first meaningful token */
function detectDiagramType(source: string): string | null {
  const firstLine = source.trim().split("\n")[0]?.trim() ?? "";
  const knownTypes = [
    "flowchart",
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram-v2",
    "stateDiagram",
    "erDiagram",
    "gantt",
    "pie",
    "journey",
    "gitGraph",
    "mindmap",
    "timeline",
    "quadrantChart",
    "xychart-beta",
    "sankey-beta",
    "block-beta",
    "packet-beta",
    "architecture-beta",
    "kanban",
    "zenuml",
    "requirementDiagram",
    "C4Context",
    "C4Container",
    "C4Component",
    "C4Deployment",
    "C4Dynamic",
  ];

  for (const t of knownTypes) {
    if (firstLine.startsWith(t)) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Index extraction (§42)
// ---------------------------------------------------------------------------

/**
 * Extract diagram index records from a Markdown source string.
 * This is a pure function — no DOM, no renderer, no side effects.
 */
export function extractDiagramRecords(
  markdown: string,
  path: string
): DiagramIndexRecord[] {
  const records: DiagramIndexRecord[] = [];
  const lines = markdown.split("\n");
  let insideMermaid = false;
  let startLine = 0;
  let blockLines: string[] = [];
  let ordinal = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!insideMermaid) {
      if (/^```mermaid\s*$/i.test(trimmed)) {
        insideMermaid = true;
        startLine = i + 1; // 1-indexed
        blockLines = [];
      }
    } else {
      if (/^```\s*$/.test(trimmed)) {
        const source = blockLines.join("\n").trim();
        if (source.length > 0) {
          records.push({
            path,
            blockId: `${path}:mermaid-${ordinal}`,
            line: startLine,
            endLine: i + 1, // 1-indexed
            ordinal,
            type: detectDiagramType(source),
            sourceHash: simpleHash(source),
            source,
          });
          ordinal++;
        }
        insideMermaid = false;
        blockLines = [];
      } else {
        blockLines.push(line);
      }
    }
  }

  return records;
}

// ---------------------------------------------------------------------------
// Runtime status store (§44 — transitório, nunca persistido)
// ---------------------------------------------------------------------------

export class DiagramStatusStore {
  private statuses = new Map<string, { status: DiagramRenderStatus; svg?: string; error?: string }>();

  getStatus(blockId: string): DiagramRenderStatus {
    return this.statuses.get(blockId)?.status ?? "unrendered";
  }

  getSvg(blockId: string): string | undefined {
    return this.statuses.get(blockId)?.svg;
  }

  getError(blockId: string): string | undefined {
    return this.statuses.get(blockId)?.error;
  }

  setRendering(blockId: string): void {
    this.statuses.set(blockId, { status: "rendering" });
  }

  setRendered(blockId: string, svg: string): void {
    this.statuses.set(blockId, { status: "rendered", svg });
  }

  setInvalid(blockId: string, error: string): void {
    this.statuses.set(blockId, { status: "invalid", error });
  }

  setError(blockId: string, error: string): void {
    this.statuses.set(blockId, { status: "error", error });
  }

  clear(): void {
    this.statuses.clear();
  }

  /** Build a combined DiagramRecord from index record + runtime status */
  toDiagramRecord(index: DiagramIndexRecord): DiagramRecord {
    const entry = this.statuses.get(index.blockId);
    return {
      ...index,
      status: entry?.status ?? "unrendered",
      svgContent: entry?.svg,
      errorMessage: entry?.error,
    };
  }
}

// ---------------------------------------------------------------------------
// MermaidExplorerService — workspace-level diagram catalog
// ---------------------------------------------------------------------------

export class MermaidExplorerService {
  /** Index records keyed by file path */
  private indexByPath = new Map<string, DiagramIndexRecord[]>();
  private statusStore = new DiagramStatusStore();
  private listeners = new Set<() => void>();

  /** Re-index a single document (called on file open / content change) */
  indexDocument(path: string, markdown: string): void {
    const records = extractDiagramRecords(markdown, path);
    this.indexByPath.set(path, records);
    this.notify();
  }

  /** Remove a document from the index */
  removeDocument(path: string): void {
    this.indexByPath.delete(path);
    this.notify();
  }

  /** Get all diagram records for a specific document */
  getDocumentDiagrams(path: string): DiagramRecord[] {
    const records = this.indexByPath.get(path) ?? [];
    return records.map((r) => this.statusStore.toDiagramRecord(r));
  }

  /** Get all diagram records across the workspace */
  getWorkspaceDiagrams(): DiagramRecord[] {
    const all: DiagramRecord[] = [];
    for (const records of this.indexByPath.values()) {
      for (const r of records) {
        all.push(this.statusStore.toDiagramRecord(r));
      }
    }
    return all;
  }

  /** Get total count across workspace */
  getWorkspaceCount(): number {
    let count = 0;
    for (const records of this.indexByPath.values()) {
      count += records.length;
    }
    return count;
  }

  /** Access the status store for render status updates */
  getStatusStore(): DiagramStatusStore {
    return this.statusStore;
  }

  /** Subscribe to changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Clear all data */
  clear(): void {
    this.indexByPath.clear();
    this.statusStore.clear();
    this.notify();
  }
}

/** Singleton service instance */
export const mermaidExplorer = new MermaidExplorerService();
