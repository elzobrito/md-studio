import type { ReactNode } from 'react';
import { FolderIcon, FolderOpenIcon, FilePlusIcon, CloseIcon } from '../icons';

export type SidebarTab = 'files' | 'todos';

export interface IntegratedWorkspaceSidebarProps {
  workspaceLabel?: string | null;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onOpenFolder?: () => void;
  onOpenFile?: () => void;
  onNewDocument?: () => void;
  onCloseSidebar?: () => void;
  todoCount?: number;
  children?: ReactNode;
}

/**
 * Integrated Workspace Sidebar for MD Studio R3.
 * Normative reference: 053-nova-gui-R3.md (Tasks 053-J, PARTE VI)
 * Single unified left sidebar containing workspace header, quick actions,
 * integrated utilities (Arquivos / Tarefas), and retiring the separate WorkspaceRail.
 */
export function IntegratedWorkspaceSidebar({
  workspaceLabel,
  activeTab,
  onTabChange,
  onOpenFolder,
  onOpenFile,
  onNewDocument,
  onCloseSidebar,
  todoCount,
  children,
}: IntegratedWorkspaceSidebarProps) {
  const title = workspaceLabel || 'Workspace';

  return (
    <div className="integrated-sidebar" role="region" aria-label="Navegador do Workspace">
      {/* Workspace Header */}
      <div className="sidebar-header">
        <div className="sidebar-workspace-title" title={`Workspace: ${title}`}>
          <FolderIcon size={16} />
          <span>{title}</span>
        </div>
        {onCloseSidebar && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onCloseSidebar}
            title="Recolher barra lateral"
            aria-label="Recolher barra lateral"
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {/* Quick Actions */}
      {(onOpenFolder || onOpenFile || onNewDocument) && (
        <div className="sidebar-quick-actions">
          {onOpenFolder && (
            <button
              type="button"
              className="sidebar-action-btn-primary"
              onClick={onOpenFolder}
              title="Abrir pasta como workspace"
            >
              <FolderOpenIcon size={14} />
              <span>Abrir pasta</span>
            </button>
          )}
          {onOpenFile && (
            <button
              type="button"
              className="sidebar-action-btn-secondary"
              onClick={onOpenFile}
              title="Abrir arquivo Markdown avulso"
            >
              <FilePlusIcon size={13} />
              <span>Abrir arquivo</span>
            </button>
          )}
        </div>
      )}

      {/* Unified Utilities / Mode Tabs */}
      <div className="sidebar-tabs" role="tablist" aria-label="Modos do Workspace">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'files'}
          className={`sidebar-tab-btn${activeTab === 'files' ? ' is-active' : ''}`}
          onClick={() => onTabChange('files')}
          title="Explorador de Arquivos"
        >
          <FolderIcon size={13} />
          <span>Arquivos</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'todos'}
          className={`sidebar-tab-btn${activeTab === 'todos' ? ' is-active' : ''}`}
          onClick={() => onTabChange('todos')}
          title="TODO Explorer"
        >
          <span>Tarefas</span>
          {typeof todoCount === 'number' && todoCount > 0 && (
            <span style={{ fontSize: '10px', opacity: 0.8 }}>({todoCount})</span>
          )}
        </button>
      </div>

      {/* Main Content Area: FileTree or TodoExplorer */}
      <div className="sidebar-content-area">
        {children}
      </div>
    </div>
  );
}
