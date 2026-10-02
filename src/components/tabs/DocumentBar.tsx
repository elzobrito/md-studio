import type { ReactNode } from 'react';
import type { ViewMode } from '../../state/session';
import type { SplitOrientation } from '../layout/SplitDivider';
import { DocumentTabs, type OpenDocumentTabItem } from './DocumentTabs';
import { SplitIcon, SplitHorizontalIcon } from '../icons';

export interface DocumentBarProps {
  tabs: OpenDocumentTabItem[];
  activeDocumentId: string | null;
  onSelectTab: (documentId: string) => void;
  onCloseTab: (documentId: string) => void;
  onNewTab?: () => void;
  viewMode: ViewMode;
  splitOrientation?: SplitOrientation;
  onChangeSplitOrientation?: (orientation: SplitOrientation) => void;
  extraControls?: ReactNode;
}

/**
 * Contextual bar for the active document.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-L, 053-M, PARTE IX)
 * Keeps document tabs and split-orientation controls separate from global header actions.
 */
export function DocumentBar({
  tabs,
  activeDocumentId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  viewMode,
  splitOrientation = 'vertical',
  onChangeSplitOrientation,
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

      {(extraControls || viewMode === 'split') && (
        <div className="document-bar-actions">
          {extraControls}

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
        </div>
      )}
    </div>
  );
}
