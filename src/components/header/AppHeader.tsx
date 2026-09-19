import type { ReactNode } from "react";
import type { ViewMode } from "../../state/session";
import { useSaveStatus } from "../../hooks/useSaveStatus";
import { ViewModeToggle } from "./ViewModeToggle";
import { SaveButton } from "./SaveButton";
import { PanelControls } from "./PanelControls";
import "../../styles/header.css";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onSave: () => void;
  canSave: boolean;
  fileName?: string;
  onNewDocument?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenShortcuts?: () => void;
  breadcrumb?: ReactNode;
}

export function AppHeader({
  viewMode,
  onViewModeChange,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  onSave,
  canSave,
  fileName,
  onNewDocument,
  onOpenSearch,
  onOpenSettings,
  onOpenShortcuts,
  breadcrumb,
}: Props) {
  const { status, errorMessage } = useSaveStatus(fileName);

  return (
    <header className="app-header" role="banner">
      <div className="app-toolbar">
        <div className="app-toolbar-left">
          <button
            type="button"
            className="toolbar-action-btn"
            onClick={onToggleLeft}
            title={leftOpen ? "Ocultar arquivos (Ctrl+\\)" : "Mostrar arquivos (Ctrl+\\)"}
            aria-label="Alternar painel esquerdo"
          >
            ≡
          </button>
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              📝
            </span>
            <strong>MD Studio</strong>
          </div>
        </div>

        <div className="app-toolbar-center">
          <ViewModeToggle current={viewMode} onChange={onViewModeChange} />
        </div>

        <div className="app-toolbar-right">
          {onNewDocument && (
            <button
              type="button"
              className="toolbar-action-btn"
              onClick={onNewDocument}
              title="Novo documento Markdown (Ctrl+N)"
              aria-label="Novo documento"
            >
              ➕
            </button>
          )}

          {onOpenSearch && (
            <button
              type="button"
              className="toolbar-action-btn"
              onClick={onOpenSearch}
              title="Busca rápida de arquivos (Ctrl+P)"
              aria-label="Busca rápida"
            >
              🔍
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              className="toolbar-action-btn"
              onClick={onOpenSettings}
              title="Configurações (Ctrl+,)"
              aria-label="Configurações"
            >
              ⚙
            </button>
          )}

          <button
            type="button"
            className={`toolbar-action-btn${rightOpen ? " is-active" : ""}`}
            onClick={onToggleRight}
            title={rightOpen ? "Ocultar sumário (Ctrl+Shift+\\)" : "Mostrar sumário (Ctrl+Shift+\\)"}
            aria-label="Alternar sumário"
            aria-pressed={rightOpen}
          >
            ≡
          </button>

          <SaveButton
            status={status}
            onSave={onSave}
            disabled={!canSave}
            errorMessage={errorMessage}
          />
        </div>
      </div>

      {breadcrumb && <div className="app-header-breadcrumb">{breadcrumb}</div>}
    </header>
  );
}
