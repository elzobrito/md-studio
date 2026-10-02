import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentTabs, type OpenDocumentTabItem } from '../../src/components/tabs/DocumentTabs';
import { DocumentBar } from '../../src/components/tabs/DocumentBar';
import { AppHeader } from '../../src/components/header/AppHeader';
import { PreviewSubToolbar } from '../../src/components/preview/PreviewSubToolbar';
import type { ViewMode } from '../../src/state/session';

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
    const renderDocumentToolbars = (viewMode: ViewMode) =>
      renderToStaticMarkup(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(AppHeader, {
            viewMode,
            onViewModeChange: () => {},
            leftOpen: true,
            rightOpen: true,
            onToggleLeft: () => {},
            onToggleRight: () => {},
            onSave: () => {},
            canSave: true,
            canExport: true,
            onExportHtml: () => {},
            onExportPdf: () => {},
            onExportEpub: () => {},
            fileName: 'architecture.md',
            onStartPresentation: () => {},
            onNavigateHome: () => {},
            onOpenSearch: () => {},
            onOpenSettings: () => {},
            onToggleTheme: () => {},
          }),
          React.createElement(DocumentBar, {
            tabs: [
              {
                documentId: 'doc-active',
                canonicalPath: 'architecture.md',
                displayName: 'architecture.md',
                dirty: false,
                active: true,
              },
            ],
            activeDocumentId: 'doc-active',
            onSelectTab: () => {},
            onCloseTab: () => {},
            viewMode,
            splitOrientation: 'vertical',
            onChangeSplitOrientation: () => {},
          }),
          viewMode !== 'source' &&
            React.createElement(PreviewSubToolbar, {
              currentSubMode: 'view',
              onChangeSubMode: () => {},
              zoomLevel: 1,
              onChangeZoom: () => {},
              isMaximized: false,
            }),
        ),
      );

    it.each(['source', 'preview', 'split'] as const)(
      'keeps global document actions unique in %s mode',
      (viewMode) => {
        const html = renderDocumentToolbars(viewMode);
        const count = (value: string) => html.split(value).length - 1;

        expect(html).toContain('role="banner"');
        expect(html).toContain('class="document-bar"');
        expect(html).toContain('architecture.md');
        expect(count('aria-label="Modo de visualização"')).toBe(1);
        expect(count('aria-label="Modo Apresentação"')).toBe(1);
        expect(count('aria-label="Salvar"')).toBe(1);
        expect(count('aria-label="Exportar"')).toBe(1);
        expect(count('>Markdown</button>')).toBe(1);
        expect(count('>Formatado</button>')).toBe(1);
        expect(count('>Dividida</button>')).toBe(1);

        if (viewMode === 'split') {
          expect(html).toContain('aria-label="Orientação da visualização dividida"');
          expect(html).toContain('aria-label="Divisão Vertical"');
          expect(html).toContain('aria-label="Divisão Horizontal"');
        } else {
          expect(html).not.toContain('aria-label="Orientação da visualização dividida"');
        }

        if (viewMode === 'source') {
          expect(html).not.toContain('aria-label="Barra de ferramentas do preview"');
        } else {
          expect(html).toContain('aria-label="Barra de ferramentas do preview"');
          expect(html).toContain('Visualização');
          expect(html).toContain('HTML gerado');
          expect(html).toContain('Diff vs salvo');
          expect(html).toContain('100%');
        }
      },
    );

    it('does not render global actions in the contextual document bar', () => {
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
          onChangeSplitOrientation: () => {},
        })
      );

      expect(html).toContain('role="toolbar"');
      expect(html).toContain('class="document-bar"');
      expect(html).toContain('architecture.md');
      expect(html).toContain('aria-label="Orientação da visualização dividida"');
      expect(html).not.toContain('aria-label="Modo de visualização"');
      expect(html).not.toContain('aria-label="Modo Apresentação"');
      expect(html).not.toContain('aria-label="Salvar"');
      expect(html).not.toContain('aria-label="Exportar"');
    });
  });
});
