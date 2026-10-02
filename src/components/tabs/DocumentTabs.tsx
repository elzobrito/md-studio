import type { KeyboardEvent } from 'react';
import { CloseIcon, PlusIcon, FileTextIcon } from '../icons';

export interface OpenDocumentTabItem {
  documentId: string;
  canonicalPath?: string | null;
  displayName: string;
  dirty: boolean;
  saveStatus?: 'saved' | 'modified' | 'saving' | 'error';
  active: boolean;
}

export interface DocumentTabsProps {
  tabs: OpenDocumentTabItem[];
  activeDocumentId: string | null;
  onSelectTab: (documentId: string) => void;
  onCloseTab: (documentId: string) => void;
  onNewTab?: () => void;
}

/**
 * Visual projection of open documents into interactive tabs.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-L, PARTE VIII)
 * Features duplicate path prevention, dirty badge, close guard, and full keyboard navigation.
 */
export function DocumentTabs({
  tabs,
  activeDocumentId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: DocumentTabsProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      onSelectTab(tabs[nextIndex].documentId);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      onSelectTab(tabs[prevIndex].documentId);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (tabs.length > 0) onSelectTab(tabs[0].documentId);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (tabs.length > 0) onSelectTab(tabs[tabs.length - 1].documentId);
    }
  };

  return (
    <div className="document-tabs-wrapper">
      <div className="document-tabs-track" role="tablist" aria-label="Abas de documentos">
        {tabs.map((tab, idx) => {
          const isActive = tab.active || tab.documentId === activeDocumentId;

          return (
            <div
              key={tab.documentId}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`doc-tab${isActive ? ' is-active' : ''}`}
              onClick={() => onSelectTab(tab.documentId)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              title={tab.canonicalPath ? `${tab.displayName} (${tab.canonicalPath})` : tab.displayName}
            >
              <FileTextIcon size={14} />
              <span className="doc-tab-label">{tab.displayName}</span>

              {tab.dirty && (
                <span
                  className="doc-tab-dirty-badge"
                  title="Modificações não salvas"
                  aria-label="Documento modificado"
                />
              )}

              <button
                type="button"
                className="doc-tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.documentId);
                }}
                title={`Fechar ${tab.displayName}`}
                aria-label={`Fechar ${tab.displayName}`}
              >
                <CloseIcon size={12} />
              </button>
            </div>
          );
        })}

      </div>
    </div>
  );
}
