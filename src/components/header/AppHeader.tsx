import type { ReactNode } from "react";
import type { ViewMode } from "../../state/session";
import { useSaveStatus } from "../../hooks/useSaveStatus";
import { ViewModeToggle } from "./ViewModeToggle";
import { SaveButton } from "./SaveButton";
import { ExportMenu } from "./ExportMenu";
import { GlobalAppBar } from "../shell/GlobalAppBar";
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
  canExport?: boolean;
  onExportHtml?: () => void;
  onExportPdf?: () => void;
  onExportEpub?: () => void;
  fileName?: string;
  onNewDocument?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenShortcuts?: () => void;
  onStartPresentation?: () => void;
  onNavigateHome?: () => void;
  onToggleTheme?: () => void;
  currentTheme?: "light" | "dark" | "auto";
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
  canExport,
  onExportHtml,
  onExportPdf,
  onExportEpub,
  fileName,
  onNewDocument,
  onOpenSearch,
  onOpenSettings,
  onStartPresentation,
  onNavigateHome,
  onToggleTheme,
  currentTheme = "dark",
  breadcrumb,
}: Props) {
  const { status, errorMessage } = useSaveStatus(fileName);

  const extraDocumentActions = (
    <div className="app-header-doc-actions" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <ViewModeToggle current={viewMode} onChange={onViewModeChange} />
      {onStartPresentation && (
        <button
          type="button"
          className="appbar-btn"
          onClick={onStartPresentation}
          title="Modo Apresentação (F5)"
          aria-label="Modo Apresentação"
        >
          <span style={{ fontSize: "14px" }}>📽️</span>
        </button>
      )}
      <SaveButton
        status={status}
        onSave={onSave}
        disabled={!canSave}
        errorMessage={errorMessage}
      />
      {(onExportHtml || onExportPdf || onExportEpub) && (
        <ExportMenu
          disabled={canExport !== undefined ? !canExport : !canSave}
          onExportHtml={onExportHtml}
          onExportPdf={onExportPdf}
          onExportEpub={onExportEpub}
        />
      )}
    </div>
  );

  return (
    <div className="app-header-container">
      <GlobalAppBar
        sidebarOpen={leftOpen}
        onToggleSidebar={onToggleLeft}
        inspectorOpen={rightOpen}
        onToggleInspector={onToggleRight}
        onNavigateHome={onNavigateHome ?? (() => {})}
        onOpenSearch={onOpenSearch ?? (() => {})}
        onToggleTheme={onToggleTheme ?? (() => {})}
        currentTheme={currentTheme}
        onOpenSettings={onOpenSettings ?? (() => {})}
        onNewDocument={onNewDocument}
        extraActions={extraDocumentActions}
      />
      {breadcrumb && <div className="app-header-breadcrumb">{breadcrumb}</div>}
    </div>
  );
}
