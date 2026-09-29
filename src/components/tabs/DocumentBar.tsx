import type { ReactNode } from 'react';
import type { ViewMode } from '../../state/session';
import type { SaveStatus } from '../../state/editor';
import type { SplitOrientation } from '../layout/SplitDivider';
import { DocumentTabs, type OpenDocumentTabItem } from './DocumentTabs';
import { ViewModeToggle } from '../header/ViewModeToggle';
import { SaveButton } from '../header/SaveButton';
import { ExportMenu } from '../header/ExportMenu';
import { SplitIcon, SplitHorizontalIcon } from '../icons';

export interface DocumentBarProps {
  tabs: OpenDocumentTabItem[];
  activeDocumentId: string | null;
  onSelectTab: (documentId: string) => void;
  onCloseTab: (documentId: string) => void;
  onNewTab?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  splitOrientation?: SplitOrientation;
  onChangeSplitOrientation?: (orientation: SplitOrientation) => void;
  onSave: () => void;
  canSave: boolean;
  saveStatus?: SaveStatus;
  errorMessage?: string;
  onExportHtml?: () => void;
  onExportPdf?: () => void;
  onExportEpub?: () => void;
  onStartPresentation?: () => void;
  extraControls?: ReactNode;
}

/**
 * Top contextual toolbar for the active document.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-L, 053-M, PARTE IX)
 * Integrates DocumentTabs on the left with ViewModeToggle, SplitOrientation controls,
 * SaveButton, ExportMenu, and document actions on the right.
 */
export function DocumentBar({
  tabs,
  activeDocumentId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  viewMode,
  onViewModeChange,
  splitOrientation = 'vertical',
  onChangeSplitOrientation,
  onSave,
  canSave,
  saveStatus = 'saved',
  errorMessage,
  onExportHtml,
  onExportPdf,
  onExportEpub,
  onStartPresentation,
  extraControls,
}: DocumentBarProps) {
  return (
    <div className="document-bar" role="toolbar" aria-label="Barra do documento">
      {/* Left: Open tabs */}
      <DocumentTabs
        tabs={tabs}
        activeDocumentId={activeDocumentId}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />

      {/* Right: Document-specific actions & view mode */}
      <div className="document-bar-actions">
        {extraControls}

        <ViewModeToggle current={viewMode} onChange={onViewModeChange} />

        {viewMode === 'split' && (
          <div
            className="split-orientation-controls"
            role="group"
            aria-label="Orientação da visualização dividida"
          >
            <button
              type="button"
              className={`split-orientation-btn ${splitOrientation === 'vertical' ? 'active' : ''}`}
              onClick={() => onChangeSplitOrientation?.('vertical')}
              title="Divisão Vertical (Lado a Lado)"
              aria-label="Divisão Vertical"
              aria-pressed={splitOrientation === 'vertical'}
            >
              <SplitIcon width={14} height={14} />
            </button>
            <button
              type="button"
              className={`split-orientation-btn ${splitOrientation === 'horizontal' ? 'active' : ''}`}
              onClick={() => onChangeSplitOrientation?.('horizontal')}
              title="Divisão Horizontal (Topo/Base)"
              aria-label="Divisão Horizontal"
              aria-pressed={splitOrientation === 'horizontal'}
            >
              <SplitHorizontalIcon width={14} height={14} />
            </button>
          </div>
        )}

        {onStartPresentation && (
          <button
            type="button"
            className="appbar-btn"
            onClick={onStartPresentation}
            title="Modo Apresentação (F5)"
            aria-label="Modo Apresentação"
          >
            <span style={{ fontSize: '13px' }}>📽️</span>
          </button>
        )}

        <SaveButton
          status={saveStatus}
          onSave={onSave}
          disabled={!canSave}
          errorMessage={errorMessage}
        />

        {(onExportHtml || onExportPdf || onExportEpub) && (
          <ExportMenu
            disabled={!canSave}
            onExportHtml={onExportHtml}
            onExportPdf={onExportPdf}
            onExportEpub={onExportEpub}
          />
        )}
      </div>
    </div>
  );
}
