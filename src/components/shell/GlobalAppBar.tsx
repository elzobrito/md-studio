import type { ReactNode } from 'react';
import {
  SidebarIcon,
  InspectorIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  SettingsIcon,
  FilePlusIcon,
} from '../icons';

export interface GlobalAppBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onNavigateHome: () => void;
  onOpenSearch: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark' | 'auto';
  onOpenSettings: () => void;
  onNewDocument?: () => void;
  extraActions?: ReactNode;
}

/**
 * Global App Bar for MD Studio R3.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-I, sections 71-78)
 * Houses strictly global actions: Workspace sidebar toggle, brand home,
 * transversal search / command palette trigger, theme switch, settings and inspector toggle.
 */
export function GlobalAppBar({
  sidebarOpen,
  onToggleSidebar,
  inspectorOpen,
  onToggleInspector,
  onNavigateHome,
  onOpenSearch,
  onToggleTheme,
  currentTheme,
  onOpenSettings,
  onNewDocument,
  extraActions,
}: GlobalAppBarProps) {
  const isDark = currentTheme === 'dark';

  return (
    <header className="global-appbar" role="banner" aria-label="Barra global do aplicativo">
      {/* Left: Sidebar toggle, Brand & Home */}
      <div className="global-appbar-left">
        <button
          type="button"
          className={`appbar-btn${sidebarOpen ? ' is-active' : ''}`}
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Ocultar explorador de arquivos (Ctrl+B)' : 'Mostrar explorador de arquivos (Ctrl+B)'}
          aria-label="Alternar explorador de arquivos"
          aria-pressed={sidebarOpen}
        >
          <SidebarIcon size={18} />
        </button>

        <button
          type="button"
          className="appbar-brand-group"
          onClick={onNavigateHome}
          title="Ir para o início (Home / Boas-vindas)"
          aria-label="MD Studio Home"
        >
          <div className="appbar-brand-badge">MD</div>
          <span className="appbar-brand-title">MD Studio</span>
        </button>

        {onNewDocument && (
          <button
            type="button"
            className="appbar-btn"
            onClick={onNewDocument}
            title="Novo documento (Ctrl+N)"
            aria-label="Novo documento"
          >
            <FilePlusIcon size={18} />
          </button>
        )}
      </div>

      {/* Center: Global Search / Command Palette trigger */}
      <div className="global-appbar-center">
        <button
          type="button"
          className="appbar-search-trigger"
          onClick={onOpenSearch}
          title="Buscar arquivos ou comandos (Ctrl+P)"
          aria-label="Buscar arquivos ou comandos"
        >
          <span className="appbar-search-icon">
            <SearchIcon size={15} />
          </span>
          <span className="truncate">Buscar arquivos ou comandos...</span>
          <kbd className="appbar-search-kbd">Ctrl+P</kbd>
        </button>
      </div>

      {/* Right: Theme, Settings, Inspector toggle, Extra Actions */}
      <div className="global-appbar-right">
        {extraActions}

        <button
          type="button"
          className="appbar-btn"
          onClick={onToggleTheme}
          title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          aria-label="Alternar tema"
        >
          {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        <button
          type="button"
          className="appbar-btn"
          onClick={onOpenSettings}
          title="Configurações (Ctrl+,)"
          aria-label="Configurações"
        >
          <SettingsIcon size={18} />
        </button>

        <button
          type="button"
          className={`appbar-btn${inspectorOpen ? ' is-active' : ''}`}
          onClick={onToggleInspector}
          title={inspectorOpen ? 'Ocultar painel de inspeção (Ctrl+Shift+\\)' : 'Mostrar painel de inspeção (Ctrl+Shift+\\)'}
          aria-label="Alternar painel de inspeção"
          aria-pressed={inspectorOpen}
        >
          <InspectorIcon size={18} />
        </button>
      </div>
    </header>
  );
}
