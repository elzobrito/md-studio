import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WelcomeScreen } from '../../src/components/empty/WelcomeScreen';
import { WorkspaceHome } from '../../src/components/home/WorkspaceHome';
import type { WorkspaceDescriptor } from '../../src/contracts/types';

describe('Task 053-K: Workspace Home Semantics', () => {
  describe('WelcomeScreen Semantics', () => {
    it('uses normative primary label "Abrir Workspace" instead of "Abrir Pasta"', () => {
      const html = renderToStaticMarkup(
        React.createElement(WelcomeScreen, {
          onOpenFolder: () => {},
          onOpenFile: () => {},
          onOpenRecent: () => {},
          onNewDocument: () => {},
        })
      );

      expect(html).toContain('Abrir Workspace');
      expect(html).not.toContain('Abrir Pasta');
      expect(html).toContain('Abrir Arquivo');
      expect(html).toContain('Novo Documento');
      expect(html).toContain('Ambiente de Documentação e Engenharia Local-first');
    });
  });

  describe('WorkspaceHome Surface', () => {
    it('renders welcome surface when no workspace is active', () => {
      const html = renderToStaticMarkup(
        React.createElement(WorkspaceHome, {
          workspace: null,
          onOpenFolder: () => {},
          onOpenFile: () => {},
          onOpenRecent: () => {},
          onNewDocument: () => {},
          onQuickSwitch: () => {},
        })
      );

      expect(html).toContain('MD Studio');
      expect(html).toContain('Abrir Workspace');
      expect(html).toContain('Local-first');
    });

    it('renders active workspace surface with title and readiness when workspace is provided', () => {
      const mockWorkspace: WorkspaceDescriptor = {
        id: 'ws-123',
        rootLabel: 'DocumentacaoEngenharia',
        kind: 'folder',
      };

      const html = renderToStaticMarkup(
        React.createElement(WorkspaceHome, {
          workspace: mockWorkspace,
          onOpenFolder: () => {},
          onOpenFile: () => {},
          onOpenRecent: () => {},
          onNewDocument: () => {},
          onQuickSwitch: () => {},
        })
      );

      expect(html).toContain('DocumentacaoEngenharia');
      expect(html).toContain('Workspace Ativo • Local-first');
      expect(html).toContain('Novo Documento');
      expect(html).toContain('Buscar Arquivos (Ctrl+P)');
      expect(html).toContain('Trocar Workspace');
      expect(html).toContain('Índice de metadados pronto');
    });
  });
});
