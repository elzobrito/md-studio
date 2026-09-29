/**
 * MermaidExpandedModal.tsx - Modal de visualização ampliada de diagrama Mermaid
 * Conforme especificação 051-mermaid-explorer.md
 *
 * Regras:
 * - Reutiliza renderMermaid() de src/markdown/mermaid.ts (renderer canônico)
 * - Reutiliza downloadSvg/downloadPng de src/services/diagramExport.ts (export canônico)
 * - Não cria segundo pipeline de render nem de export
 * - 100% offline, local-first
 */
import { useState, useEffect, useCallback, useRef } from "react";
import type { DiagramRecord } from "../../services/mermaidExplorer";
import { renderMermaid } from "../../markdown/mermaid";
import { downloadSvg, downloadPng } from "../../services/diagramExport";
import "../../styles/mermaid-explorer.css";

export interface MermaidExpandedModalProps {
  record: DiagramRecord | null;
  onClose: () => void;
  onNavigate?: (path: string, line: number) => void;
}

export function MermaidExpandedModal({
  record,
  onClose,
  onNavigate,
}: MermaidExpandedModalProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Render diagram on open / source change
  useEffect(() => {
    if (!record) {
      setSvg(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    setError(null);

    renderMermaid(`expanded-${record.blockId}`, record.source)
      .then((result) => {
        if (cancelled) return;
        if (result.svg) {
          setSvg(result.svg);
          setError(null);
        } else {
          setSvg(null);
          setError(result.error ?? "Erro de renderização");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setIsRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record]);

  // Close on Escape
  useEffect(() => {
    if (!record) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [record, onClose]);

  const handleExportSvg = useCallback(() => {
    if (!svg || !record) return;
    const baseName = record.path.split("/").pop()?.replace(/\.md$/i, "") ?? "diagram";
    downloadSvg(svg, `${baseName}-${record.ordinal}.svg`);
  }, [svg, record]);

  const handleExportPng = useCallback(async () => {
    if (!svg || !record) return;
    const baseName = record.path.split("/").pop()?.replace(/\.md$/i, "") ?? "diagram";
    await downloadPng(svg, `${baseName}-${record.ordinal}.png`);
  }, [svg, record]);

  const handleGoToSource = useCallback(() => {
    if (!record) return;
    onNavigate?.(record.path, record.line);
    onClose();
  }, [record, onNavigate, onClose]);

  if (!record) return null;

  const typeLabel = record.type ?? "mermaid";

  return (
    <div
      className="mermaid-expanded-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Diagrama ${typeLabel} ampliado`}
    >
      <div className="mermaid-expanded-modal">
        <div className="mermaid-expanded-header">
          <h3 className="mermaid-expanded-title">
            {typeLabel} — {record.path.split("/").pop()}:L{record.line}
          </h3>
          <div className="mermaid-expanded-actions">
            <button
              type="button"
              className="mermaid-expanded-btn"
              onClick={() => setShowSource(!showSource)}
              title={showSource ? "Ver diagrama" : "Ver fonte"}
            >
              {showSource ? "Diagrama" : "Fonte"}
            </button>
            <button
              type="button"
              className="mermaid-expanded-btn"
              onClick={handleGoToSource}
              title="Ir ao source no editor"
            >
              Ir ao Source
            </button>
            {svg && (
              <>
                <button
                  type="button"
                  className="mermaid-expanded-btn"
                  onClick={handleExportSvg}
                  title="Exportar SVG"
                >
                  SVG
                </button>
                <button
                  type="button"
                  className="mermaid-expanded-btn"
                  onClick={() => void handleExportPng()}
                  title="Exportar PNG"
                >
                  PNG
                </button>
              </>
            )}
            <button
              type="button"
              className="mermaid-expanded-close"
              onClick={onClose}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mermaid-expanded-body" ref={containerRef}>
          {showSource ? (
            <pre className="mermaid-expanded-source">
              <code>{record.source}</code>
            </pre>
          ) : isRendering ? (
            <div className="mermaid-expanded-loading">Renderizando diagrama…</div>
          ) : error ? (
            <div className="mermaid-expanded-error">
              <p>Erro na renderização:</p>
              <pre>{error}</pre>
              <pre className="mermaid-expanded-fallback">
                <code>{record.source}</code>
              </pre>
            </div>
          ) : svg ? (
            <div
              className="mermaid-expanded-svg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="mermaid-expanded-empty">Sem conteúdo para exibir.</div>
          )}
        </div>
      </div>
    </div>
  );
}
