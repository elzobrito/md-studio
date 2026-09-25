import React from "react";
import type { Heading } from "../../types/metadata";

export type HoverPreviewStatus = "loading" | "resolved" | "unresolved" | "ambiguous";

export interface HoverPreviewData {
  target: string;
  status: HoverPreviewStatus;
  path?: string | null;
  title?: string | null;
  snippet?: string | null;
  headings?: Heading[];
  tags?: string[];
  wordCount?: number;
  lastModified?: number;
  candidates?: string[];
  headingTarget?: string | null;
  error?: string | null;
}

export interface HoverPreviewProps {
  data: HoverPreviewData | null;
  position: { x: number; y: number } | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}

/**
 * Validates that a relative path strictly stays within the workspace fence.
 * Rejects absolute paths, protocols, and directory traversal escaping the root.
 */
export function isSafeWorkspacePath(path: string): boolean {
  if (!path) return false;
  const normalized = path.replace(/\\/g, "/").trim();
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)) return false; // URLs/protocols

  const parts = normalized.split("/");
  let depth = 0;
  for (const part of parts) {
    if (part === "..") {
      depth--;
      if (depth < 0) return false;
    } else if (part && part !== ".") {
      depth++;
    }
  }
  return true;
}

export function HoverPreview({
  data,
  position,
  onMouseEnter,
  onMouseLeave,
}: HoverPreviewProps) {
  if (!data || !position) return null;

  // Calculate constrained viewport position
  const style: React.CSSProperties = {
    position: "fixed",
    left: `${Math.max(12, Math.min(position.x, window.innerWidth - 340))}px`,
    top: `${Math.min(position.y + 6, window.innerHeight - 240)}px`,
    zIndex: 1000,
    width: "320px",
    maxWidth: "90vw",
    background: "var(--bg-elevated, #1e1e2e)",
    color: "var(--fg, #cdd6f4)",
    border: "1px solid var(--border, #313244)",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
    padding: "12px",
    fontSize: "12px",
    lineHeight: "1.4",
    pointerEvents: "auto",
    userSelect: "none",
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "4px",
    marginBottom: "6px",
  };

  return (
    <div
      className="hover-preview-popover"
      style={style}
      role="tooltip"
      aria-label={`Pré-visualização de ${data.target}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {data.status === "loading" && (
        <div className="hover-preview-loading" style={{ opacity: 0.7, fontStyle: "italic" }}>
          Carregando informações do destino...
        </div>
      )}

      {data.status === "unresolved" && (
        <div className="hover-preview-unresolved">
          <div
            style={{
              ...badgeStyle,
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
            }}
          >
            Não Encontrado
          </div>
          <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>
            {data.target}
          </div>
          <p style={{ margin: "0 0 6px 0", opacity: 0.8 }}>
            Destino não existe no workspace. Clique para criar esta nota.
          </p>
        </div>
      )}

      {data.status === "ambiguous" && (
        <div className="hover-preview-ambiguous">
          <div
            style={{
              ...badgeStyle,
              background: "rgba(245, 158, 11, 0.15)",
              color: "#f59e0b",
            }}
          >
            Destino Ambíguo
          </div>
          <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>
            {data.target}
          </div>
          <p style={{ margin: "0 0 6px 0", opacity: 0.8 }}>
            Múltiplos arquivos correspondem a este link:
          </p>
          {data.candidates && data.candidates.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "16px", opacity: 0.85 }}>
              {data.candidates.map((cand, idx) => (
                <li key={idx} style={{ marginBottom: "2px", wordBreak: "break-all" }}>
                  {cand}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {data.status === "resolved" && (
        <div className="hover-preview-resolved">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                ...badgeStyle,
                background: "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
                marginBottom: 0,
              }}
            >
              Documento Local
            </span>
            {data.path && (
              <span
                style={{
                  fontSize: "10px",
                  opacity: 0.6,
                  maxWidth: "180px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={data.path}
              >
                {data.path}
              </span>
            )}
          </div>

          <div
            style={{
              fontWeight: 600,
              fontSize: "14px",
              marginTop: "4px",
              marginBottom: "6px",
              color: "var(--fg-heading, #fff)",
            }}
          >
            {data.title || (data.path ? data.path.split("/").pop() : data.target)}
          </div>

          {data.headingTarget && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--color-accent, #6366f1)",
                marginBottom: "6px",
                fontFamily: "monospace",
              }}
            >
              #{data.headingTarget}
            </div>
          )}

          {data.snippet && (
            <p
              style={{
                margin: "0 0 8px 0",
                opacity: 0.85,
                fontSize: "11px",
                lineHeight: "1.45",
                wordBreak: "break-word",
              }}
            >
              {data.snippet}
            </p>
          )}

          {data.headings && data.headings.length > 0 && (
            <div style={{ marginTop: "6px", marginBottom: "6px" }}>
              <div
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: 0.6,
                  marginBottom: "4px",
                }}
              >
                Seções Principais
              </div>
              <ul style={{ margin: 0, paddingLeft: "14px", opacity: 0.85, fontSize: "11px" }}>
                {data.headings.slice(0, 4).map((h, i) => (
                  <li key={i} style={{ marginBottom: "2px" }}>
                    <span style={{ opacity: 0.6, marginRight: "4px" }}>
                      {"#".repeat(Math.min(h.depth, 4))}
                    </span>
                    {h.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              alignItems: "center",
              marginTop: "8px",
              paddingTop: "6px",
              borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              fontSize: "10px",
              opacity: 0.7,
            }}
          >
            {data.wordCount !== undefined && data.wordCount > 0 && (
              <span>{data.wordCount} palavras</span>
            )}
            {data.tags && data.tags.length > 0 && (
              <span>{data.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
