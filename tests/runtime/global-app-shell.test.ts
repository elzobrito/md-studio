import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalAppBar } from '../../src/components/shell/GlobalAppBar';
import { AppShell } from '../../src/components/shell/AppShell';

describe('Task 053-I: Global AppShell & GlobalAppBar', () => {
  describe('GlobalAppBar component', () => {
    it('renders a single global header with role="banner" and expected branding', () => {
      const html = renderToStaticMarkup(
        React.createElement(GlobalAppBar, {
          sidebarOpen: true,
          onToggleSidebar: () => {},
          inspectorOpen: false,
          onToggleInspector: () => {},
          onNavigateHome: () => {},
          onOpenSearch: () => {},
          onToggleTheme: () => {},
          currentTheme: 'dark',
          onOpenSettings: () => {},
        })
      );

      expect(html).toContain('role="banner"');
      expect(html).toContain('class="global-appbar"');
      expect(html).toContain('MD Studio');
      expect(html).toContain('Ctrl+P');
      expect(html).toContain('aria-pressed="true"'); // sidebar open
      expect(html).toContain('aria-pressed="false"'); // inspector closed
    });

    it('renders SunIcon when theme is dark, and MoonIcon when theme is light', () => {
      const darkHtml = renderToStaticMarkup(
        React.createElement(GlobalAppBar, {
          sidebarOpen: false,
          onToggleSidebar: () => {},
          inspectorOpen: false,
          onToggleInspector: () => {},
          onNavigateHome: () => {},
          onOpenSearch: () => {},
          onToggleTheme: () => {},
          currentTheme: 'dark',
          onOpenSettings: () => {},
        })
      );
      // Dark theme presents Sun icon to switch to light
      expect(darkHtml).toContain('title="Alternar para tema claro"');

      const lightHtml = renderToStaticMarkup(
        React.createElement(GlobalAppBar, {
          sidebarOpen: false,
          onToggleSidebar: () => {},
          inspectorOpen: false,
          onToggleInspector: () => {},
          onNavigateHome: () => {},
          onOpenSearch: () => {},
          onToggleTheme: () => {},
          currentTheme: 'light',
          onOpenSettings: () => {},
        })
      );
      // Light theme presents Moon icon to switch to dark
      expect(lightHtml).toContain('title="Alternar para tema escuro"');
    });

    it('renders new document button when onNewDocument prop is provided', () => {
      const htmlWithNewDoc = renderToStaticMarkup(
        React.createElement(GlobalAppBar, {
          sidebarOpen: true,
          onToggleSidebar: () => {},
          inspectorOpen: false,
          onToggleInspector: () => {},
          onNavigateHome: () => {},
          onOpenSearch: () => {},
          onToggleTheme: () => {},
          currentTheme: 'dark',
          onOpenSettings: () => {},
          onNewDocument: () => {},
        })
      );

      expect(htmlWithNewDoc).toContain('title="Novo documento (Ctrl+N)"');
    });
  });

  describe('AppShell top-level layout composition', () => {
    it('composes top bar, 3-column workspace body, and footer status bar with proper CSS classes', () => {
      const html = renderToStaticMarkup(
        React.createElement(AppShell, {
          appBar: React.createElement('div', { id: 'test-appbar' }, 'AppBar'),
          sidebar: React.createElement('div', { id: 'test-sidebar' }, 'Sidebar'),
          centerSurface: React.createElement('div', { id: 'test-center' }, 'Center Surface'),
          inspector: React.createElement('div', { id: 'test-inspector' }, 'Inspector'),
          statusBar: React.createElement('div', { id: 'test-statusbar' }, 'StatusBar'),
          theme: 'dark',
        })
      );

      expect(html).toContain('class="app-shell theme-dark"');
      expect(html).toContain('role="application"');
      expect(html).toContain('class="app-workspace-body"');
      expect(html).toContain('class="app-center-surface"');
      expect(html).toContain('class="app-statusbar-container"');
      expect(html).toContain('id="test-appbar"');
      expect(html).toContain('id="test-sidebar"');
      expect(html).toContain('id="test-center"');
      expect(html).toContain('id="test-inspector"');
      expect(html).toContain('id="test-statusbar"');
    });
  });
});
