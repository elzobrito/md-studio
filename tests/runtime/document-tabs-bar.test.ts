import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentTabs, type OpenDocumentTabItem } from '../../src/components/tabs/DocumentTabs';
import { DocumentBar } from '../../src/components/tabs/DocumentBar';

describe('Task 053-L: DocumentTabs & DocumentBar', () => {
  describe('DocumentTabs Component', () => {
    it('renders multiple open document tabs with role="tab" and dirty badge', () => {
      const tabs: OpenDocumentTabItem[] = [
        {
          documentId: 'doc-1',
          canonicalPath: 'docs/guide.md',
          displayName: 'guide.md',
          dirty: false,
          active: true,
        },
        {
          documentId: 'doc-2',
          canonicalPath: 'README.md',
          displayName: 'README.md',
          dirty: true,
          active: false,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(DocumentTabs, {
          tabs,
          activeDocumentId: 'doc-1',
          onSelectTab: () => {},
          onCloseTab: () => {},
          onNewTab: () => {},
        })
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('guide.md');
      expect(html).toContain('README.md');
      // guide.md is active
      expect(html).toContain('aria-selected="true"');
      // README.md is dirty, must have dirty badge
      expect(html).toContain('class="doc-tab-dirty-badge"');
      expect(html).toContain('title="Nova aba (Ctrl+N)"');
    });

    it('renders close button on every tab with accessible label', () => {
      const tabs: OpenDocumentTabItem[] = [
        {
          documentId: 'doc-1',
          canonicalPath: 'spec.md',
          displayName: 'spec.md',
          dirty: false,
          active: true,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(DocumentTabs, {
          tabs,
          activeDocumentId: 'doc-1',
          onSelectTab: () => {},
          onCloseTab: () => {},
        })
      );

      expect(html).toContain('aria-label="Fechar spec.md"');
    });
  });

  describe('DocumentBar Component', () => {
    it('integrates DocumentTabs and document toolbar actions in a single bar', () => {
      const tabs: OpenDocumentTabItem[] = [
        {
          documentId: 'doc-active',
          canonicalPath: 'architecture.md',
          displayName: 'architecture.md',
          dirty: false,
          active: true,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(DocumentBar, {
          tabs,
          activeDocumentId: 'doc-active',
          onSelectTab: () => {},
          onCloseTab: () => {},
          viewMode: 'split',
          onViewModeChange: () => {},
          onSave: () => {},
          canSave: true,
          saveStatus: 'saved',
          onExportHtml: () => {},
        })
      );

      expect(html).toContain('role="toolbar"');
      expect(html).toContain('class="document-bar"');
      expect(html).toContain('architecture.md');
      expect(html).toContain('Dividida'); // ViewModeToggle
      expect(html).toContain('Exportar'); // ExportMenu
    });
  });
});
