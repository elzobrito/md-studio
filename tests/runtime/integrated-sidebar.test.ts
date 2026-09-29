import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  IntegratedWorkspaceSidebar,
  type SidebarTab,
} from '../../src/components/workspace/IntegratedWorkspaceSidebar';

describe('Task 053-J: Integrated Workspace Sidebar', () => {
  it('renders a single sidebar region with workspace header and quick actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        IntegratedWorkspaceSidebar,
        {
          workspaceLabel: 'MeuProjeto',
          activeTab: 'files',
          onTabChange: () => {},
          onOpenFolder: () => {},
          onOpenFile: () => {},
          onCloseSidebar: () => {},
          todoCount: 5,
        },
        React.createElement('div', { id: 'filetree-child' }, 'FileTreeContent')
      )
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Navegador do Workspace"');
    expect(html).toContain('MeuProjeto');
    expect(html).toContain('Abrir pasta');
    expect(html).toContain('Abrir arquivo');
    expect(html).toContain('FileTreeContent');
  });

  it('correctly marks active tab in the tablist', () => {
    const filesHtml = renderToStaticMarkup(
      React.createElement(
        IntegratedWorkspaceSidebar,
        {
          workspaceLabel: 'Docs',
          activeTab: 'files',
          onTabChange: () => {},
          todoCount: 3,
        },
        'Content'
      )
    );
    expect(filesHtml).toContain('aria-selected="true"');
    expect(filesHtml).toContain('(3)');

    const todosHtml = renderToStaticMarkup(
      React.createElement(
        IntegratedWorkspaceSidebar,
        {
          workspaceLabel: 'Docs',
          activeTab: 'todos',
          onTabChange: () => {},
          todoCount: 3,
        },
        'Content'
      )
    );
    expect(todosHtml).toContain('aria-selected="true"');
  });

  it('renders collapse button when onCloseSidebar is supplied', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        IntegratedWorkspaceSidebar,
        {
          workspaceLabel: 'Test',
          activeTab: 'files',
          onTabChange: () => {},
          onCloseSidebar: () => {},
        },
        'Content'
      )
    );
    expect(html).toContain('title="Recolher barra lateral"');
  });
});
