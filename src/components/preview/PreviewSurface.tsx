import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { PreviewSubToolbar, type PreviewSubMode } from "./PreviewSubToolbar";
import { PreviewDiffView } from "./PreviewDiffView";
import { PreviewHtmlView } from "./PreviewHtmlView";
import { MarkdownViewer } from "../MarkdownViewer";
import { processMarkdown } from "../../markdown/processor";
import type { ResolvedWikiLink } from "../../types/metadata";
import "../../styles/preview-surface.css";

export const PREVIEW_ZOOM_STORAGE_KEY = "md-studio.preview-zoom";

export function loadSavedPreviewZoom(): number {
  try {
    const saved = localStorage.getItem(PREVIEW_ZOOM_STORAGE_KEY);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.5 && val <= 2.0) {
        return val;
      }
    }
  } catch {
    /* ignore */
  }
  return 1.0;
}

export function savePreviewZoom(zoom: number): void {
  try {
    localStorage.setItem(PREVIEW_ZOOM_STORAGE_KEY, zoom.toFixed(2));
  } catch {
    /* ignore */
  }
}

export interface PreviewSurfaceProps {
  content: string;
  savedContent?: string;
  relativePath?: string | null;
  wikiLinks?: readonly ResolvedWikiLink[];
  onOpenRelative?: (path: string) => Promise<unknown> | void;
  onUnresolvedWiki?: (target: string) => void;
  onRoot?: (el: HTMLElement | null) => void;
  onChangeContent?: (content: string) => void;
  onNavigateToSource?: (pos: { line?: number; offset?: number }) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  className?: string;
}

/**
 * PreviewSurface integrates the contextual PreviewSubToolbar with dynamic
 * submodes (View, HTML, Diff vs disk), layout-safe typography zoom, and reversible
 * maximization.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-N, Seção 342, PARTE XIX).
 */
export function PreviewSurface({
  content,
  savedContent,
  relativePath,
  wikiLinks,
  onOpenRelative,
  onUnresolvedWiki,
  onRoot,
  onChangeContent,
  onNavigateToSource,
  isMaximized = false,
  onToggleMaximize,
  className = "",
}: PreviewSurfaceProps) {
  const [subMode, setSubMode] = useState<PreviewSubMode>("view");
  const [zoomLevel, setZoomLevel] = useState<number>(() => loadSavedPreviewZoom());
  const [compiledHtml, setCompiledHtml] = useState<string>("");
  const compileReqRef = useRef(0);

  // Available submodes with dynamic cardinality (no empty slots)
  const availableSubModes: PreviewSubMode[] = useMemo(() => {
    if (savedContent !== undefined) {
      return ["view", "html", "diff"];
    }
    return ["view", "html"];
  }, [savedContent]);

  // Keep compiled HTML updated for HTML submode inspection
  useEffect(() => {
    let alive = true;
    const req = ++compileReqRef.current;
    void processMarkdown(content, { wikiLinks })
      .then((res) => {
        if (alive && req === compileReqRef.current) {
          setCompiledHtml(res.html);
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      alive = false;
    };
  }, [content, wikiLinks]);

  const handleZoomChange = (nextZoom: number) => {
    setZoomLevel(nextZoom);
    savePreviewZoom(nextZoom);
  };

  const fileName = relativePath ? relativePath.split("/").pop() || "documento.md" : "sem-titulo.md";

  const canvasStyle: CSSProperties = {
    "--preview-zoom": zoomLevel.toString(),
  } as CSSProperties;

  return (
    <div
      className={`preview-surface ${isMaximized ? "is-maximized" : ""} ${className}`.trim()}
      role="region"
      aria-label="Superfície de Visualização"
    >
      <PreviewSubToolbar
        currentSubMode={subMode}
        availableSubModes={availableSubModes}
        onChangeSubMode={setSubMode}
        zoomLevel={zoomLevel}
        onChangeZoom={handleZoomChange}
        isMaximized={isMaximized}
        onToggleMaximize={onToggleMaximize}
      />

      <div className="preview-surface-canvas" data-zoom={zoomLevel} style={canvasStyle}>
        {subMode === "view" && (
          <MarkdownViewer
            content={content}
            relativePath={relativePath || ""}
            wikiLinks={wikiLinks}
            onOpenRelative={onOpenRelative}
            onUnresolvedWiki={onUnresolvedWiki}
            onRoot={onRoot}
            onChangeContent={onChangeContent}
            onNavigateToSource={onNavigateToSource}
          />
        )}

        {subMode === "html" && (
          <PreviewHtmlView htmlContent={compiledHtml} fileName={fileName} />
        )}

        {subMode === "diff" && savedContent !== undefined && (
          <PreviewDiffView
            savedContent={savedContent}
            currentContent={content}
            fileName={fileName}
          />
        )}
      </div>
    </div>
  );
}
