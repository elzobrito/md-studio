import { useEffect, useState } from "react";
import type { ViewMode } from "../../state/session";
import { uiStore } from "../../state/ui";
import { CursorPosition } from "./CursorPosition";
import { WordCount } from "./WordCount";
import { SaveStatusBadge } from "./SaveStatus";
import "../../styles/statusbar.css";

interface Props {
  viewMode: ViewMode;
  content?: string;
  encoding?: string;
  fileName?: string;
  syncScroll?: boolean;
  onToggleSyncScroll?: () => void;
  onGoToLine?: () => void;
  rightOpen?: boolean;
  onToggleRight?: () => void;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  source: "Markdown",
  preview: "Formatado",
  split: "Dividida",
};

export function StatusBar({
  viewMode,
  content,
  encoding = "UTF-8",
  fileName,
  syncScroll,
  onToggleSyncScroll,
  onGoToLine,
  rightOpen,
  onToggleRight,
}: Props) {
  const [storeRightOpen, setStoreRightOpen] = useState(() => uiStore.getState().rightPanelVisible);

  useEffect(() => {
    return uiStore.subscribe(() => {
      setStoreRightOpen(uiStore.getState().rightPanelVisible);
    });
  }, []);

  const isRightOpen = rightOpen ?? storeRightOpen;

  const handleOpenRight = () => {
    if (onToggleRight) {
      onToggleRight();
    } else {
      uiStore.setRight(true);
    }
  };

  return (
    <footer className="status-bar" role="status" aria-label="Barra de status">
      <div className="status-bar-left">
        <span className="status-bar-item view-mode-label" title="Modo de visualização atual">
          {VIEW_LABELS[viewMode]}
        </span>
        <span className="status-bar-separator" aria-hidden="true">
          │
        </span>
        <CursorPosition onClick={onGoToLine} />
        <span className="status-bar-separator" aria-hidden="true">
          │
        </span>
        <WordCount content={content} />
        {viewMode === "split" && onToggleSyncScroll && (
          <>
            <span className="status-bar-separator" aria-hidden="true">
              │
            </span>
            <button
              type="button"
              className={`status-bar-btn ${syncScroll ? "active" : ""}`}
              onClick={onToggleSyncScroll}
              title="Sincronização de scroll (Ctrl+Shift+S)"
            >
              ⇄ Sync {syncScroll ? "ON" : "OFF"}
            </button>
          </>
        )}
      </div>

      <div className="status-bar-right">
        <span className="status-bar-item encoding-label" title="Codificação de caracteres">
          {encoding}
        </span>
        <span className="status-bar-separator" aria-hidden="true">
          │
        </span>
        <SaveStatusBadge fileName={fileName} />
        {!isRightOpen && (
          <>
            <span className="status-bar-separator" aria-hidden="true">
              │
            </span>
            <button
              type="button"
              className="status-bar-btn status-bar-summary-btn"
              onClick={handleOpenRight}
              title="Abrir sumário e preferências (Ctrl+Shift+\)"
              aria-label="Abrir sumário"
            >
              [sumário]
            </button>
          </>
        )}
      </div>
    </footer>
  );
}
