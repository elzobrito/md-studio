import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Icons from '../../src/components/icons';

describe('Task 053-H: Design Tokens & Iconography', () => {
  const stylesDir = path.resolve(__dirname, '../../src/styles');

  describe('Design Tokens Integrity', () => {
    it('defines canonical shell dimensions and hit targets in design-tokens.css', () => {
      const tokensContent = fs.readFileSync(path.join(stylesDir, 'design-tokens.css'), 'utf-8');

      const requiredVariables = [
        '--appbar-height',
        '--tabs-height',
        '--docbar-height',
        '--statusbar-height',
        '--sidebar-min-width',
        '--sidebar-default-width',
        '--inspector-min-width',
        '--inspector-default-width',
        '--hit-target-comfortable',
        '--radius-sm',
        '--radius-md',
        '--radius-lg',
        '--z-dropdown',
        '--z-modal',
        '--z-toast',
      ];

      for (const v of requiredVariables) {
        expect(tokensContent, `Expected variable ${v} to be defined in design-tokens.css`).toContain(v);
      }

      // Must include focus-visible declaration
      expect(tokensContent).toContain(':focus-visible');
      expect(tokensContent).toContain('--color-focus');
    });

    it('enforces color token parity between Light and Dark themes', () => {
      const lightContent = fs.readFileSync(path.join(stylesDir, 'themes/light.css'), 'utf-8');
      const darkContent = fs.readFileSync(path.join(stylesDir, 'themes/dark.css'), 'utf-8');

      const extractColorTokens = (css: string): string[] => {
        const matches = css.match(/--color-[a-z0-9-]+(?=:)/g) || [];
        return Array.from(new Set(matches)).sort();
      };

      const lightTokens = extractColorTokens(lightContent);
      const darkTokens = extractColorTokens(darkContent);

      const requiredR3Tokens = [
        '--color-bg',
        '--color-surface',
        '--color-sidebar',
        '--color-border',
        '--color-border-subtle',
        '--color-text',
        '--color-muted',
        '--color-card',
        '--color-card-inner',
        '--color-hover',
        '--color-active-bg',
        '--color-active-border',
        '--color-accent',
        '--color-accent-hover',
        '--color-focus',
        '--color-danger',
        '--color-warning',
        '--color-success',
      ];

      for (const token of requiredR3Tokens) {
        expect(lightTokens, `Light theme must contain ${token}`).toContain(token);
        expect(darkTokens, `Dark theme must contain ${token}`).toContain(token);
      }
    });

    it('themes.css imports design-tokens.css', () => {
      const mainThemesCss = fs.readFileSync(path.join(stylesDir, 'themes.css'), 'utf-8');
      expect(mainThemesCss).toContain('@import "./design-tokens.css";');
    });
  });

  describe('Local Icon Registry', () => {
    it('exports all standard R3 navigation and action icons', () => {
      const requiredIcons = [
        'SidebarIcon',
        'InspectorIcon',
        'SplitIcon',
        'SplitHorizontalIcon',
        'EditIcon',
        'PreviewIcon',
        'DiffIcon',
        'FileIcon',
        'FileTextIcon',
        'FilePlusIcon',
        'FolderIcon',
        'FolderOpenIcon',
        'FolderPlusIcon',
        'MarkdownIcon',
        'ChevronRightIcon',
        'ChevronDownIcon',
        'CloseIcon',
        'PlusIcon',
        'TrashIcon',
        'SearchIcon',
        'SaveIcon',
        'SettingsIcon',
        'HistoryIcon',
        'BoldIcon',
        'ItalicIcon',
        'TableIcon',
        'CodeIcon',
      ];

      for (const name of requiredIcons) {
        expect(typeof (Icons as any)[name], `Expected icon ${name} to be exported`).toBe('function');
      }
    });

    it('renders clean accessible SVG elements without external dependencies', () => {
      const html = renderToStaticMarkup(React.createElement(Icons.SaveIcon, { size: 20 }));
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).toContain('width="20"');
      expect(html).toContain('height="20"');
      expect(html).toContain('fill="none"');
      expect(html).toContain('stroke="currentColor"');
      expect(html).toContain('aria-hidden="true"');
    });

    it('renders with aria-label when provided for accessibility', () => {
      const html = renderToStaticMarkup(
        React.createElement(Icons.SidebarIcon, { 'aria-label': 'Toggle Sidebar' })
      );
      expect(html).toContain('aria-label="Toggle Sidebar"');
      expect(html).not.toContain('aria-hidden="true"');
    });
  });
});
