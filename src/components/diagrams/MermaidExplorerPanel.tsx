/**
 * MermaidExplorerPanel.tsx - Workspace activity panel for Mermaid Explorer
 * Conforme especificação 051-mermaid-explorer.md
 *
 * Regras:
 * - Fonte: source Markdown é a verdade
 * - Renderer existente (mermaid.ts) é reutilizado — Explorer não duplica
 * - Export SVG/PNG existente (diagramExport.ts) é reutilizado
 * - Status de render é runtime/transitório
 * - 100% offline, local-first
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import type { DiagramRecord } from "../../services/mermaidExplorer";
import { mermaidExplorer } from "../../services/mermaidExplorer";
import "../../styles/mermaid-explorer.css";

export type MermaidExplorerView = "document" | "workspace";

export interface MermaidExplorerPanelProps {
  /** Current active document path (workspace-relative) */
  activePath?: string;
  /** Current document markdown content */
  activeMarkdown?: string;
  /** Callback: navigate editor to line in path */
  onNavigate?: (path: string, line: number) => void;
  /** Callback: open expanded modal for a diagram */
  onExpand?: (record: DiagramRecord) => void;
}

export function MermaidExplorerPanel({
  activePath,
  activeMarkdown,
  onNavigate,
  onExpand,
}: MermaidExplorerPanelProps) {
  const [view, setView] = useState<MermaidExplorerView>("document");
  const [, setTick] = useState(0);

  // Re-index active document on content change
  useEffect(() => {
    if (activePath && activeMarkdown != null) {
      mermaidExplorer.indexDocument(activePath, activeMarkdown);
    }
  }, [activePath, activeMarkdown]);

  // Subscribe to service changes
  useEffect(() => {
    const unsub = mermaidExplorer.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const diagrams = useMemo(() => {
    if (view === "document" && activePath) {
      return mermaidExplorer.getDocumentDiagrams(activePath);
    }
    return mermaidExplorer.getWorkspaceDiagrams();
  }, [view, activePath, /* eslint-disable-next-line react-hooks/exhaustive-deps */ setTick]);

  const handleNavigate = useCallback(
    (record: DiagramRecord) => {
      onNavigate?.(record.path, record.line);
    },
    [onNavigate]
  );

  const handleExpand = useCallback(
    (record: DiagramRecord) => {
      onExpand?.(record);
    },
    [onExpand]
  );

  const docCount = activePath
    ? mermaidExplorer.getDocumentDiagrams(activePath).length
    : 0;
  const wsCount = mermaidExplorer.getWorkspaceCount();

  return (
    <div className="mermaid-explorer-panel" aria-label="Mermaid Explorer">
      <div className="mermaid-explorer-header">
        <h3 className="mermaid-explorer-title">Diagramas</h3>
        <div className="mermaid-explorer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`mermaid-explorer-tab${view === "document" ? " is-active" : ""}`}
            aria-selected={view === "document"}
            onClick={() => setView("document")}
          >
            Documento ({docCount})
          </button>
          <button
            type="button"
            role="tab"
            className={`mermaid-explorer-tab${view === "workspace" ? " is-active" : ""}`}
            aria-selected={view === "workspace"}
            onClick={() => setView("workspace")}
          >
            Workspace ({wsCount})
          </button>
        </div>
      </div>

      <div className="mermaid-explorer-list" role="list">
        {diagrams.length === 0 ? (
          <div className="mermaid-explorer-empty">
            {view === "document"
              ? "Nenhum diagrama Mermaid neste documento."
              : "Nenhum diagrama Mermaid no workspace."}
          </div>
        ) : (
          diagrams.map((record) => (
            <MermaidExplorerItem
              key={record.blockId}
              record={record}
              showPath={view === "workspace"}
              onNavigate={handleNavigate}
              onExpand={handleExpand}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List Item
// ---------------------------------------------------------------------------

interface MermaidExplorerItemProps {
  record: DiagramRecord;
  showPath: boolean;
  onNavigate: (record: DiagramRecord) => void;
  onExpand: (record: DiagramRecord) => void;
}

function MermaidExplorerItem({
  record,
  showPath,
  onNavigate,
  onExpand,
}: MermaidExplorerItemProps) {
  const typeLabel = record.type ?? "mermaid";
  const statusClass = `status-${record.status}`;
  const fileName = record.path.split("/").pop() ?? record.path;

  return (
    <div
      className={`mermaid-explorer-item ${statusClass}`}
      role="listitem"
      data-block-id={record.blockId}
    >
      <button
        type="button"
        className="mermaid-explorer-item-main"
        onClick={() => onNavigate(record)}
        title={`Ir para linha ${record.line} em ${record.path}`}
      >
        <span className="mermaid-explorer-item-icon" aria-hidden="true">
          ◇
        </span>
        <span className="mermaid-explorer-item-info">
          <span className="mermaid-explorer-item-type">{typeLabel}</span>
          <span className="mermaid-explorer-item-location">
            {showPath ? `${fileName}:` : ""}L{record.line}–{record.endLine}
          </span>
        </span>
        <span className={`mermaid-explorer-item-status ${statusClass}`}>
          {record.status === "invalid" || record.status === "error" ? "⚠" : ""}
        </span>
      </button>
      <button
        type="button"
        className="mermaid-explorer-item-expand"
        onClick={() => onExpand(record)}
        title="Visualização ampliada"
        aria-label={`Ampliar diagrama ${typeLabel} na linha ${record.line}`}
      >
        ⛶
      </button>
    </div>
  );
}
