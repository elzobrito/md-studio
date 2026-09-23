import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  capturePreviousUiState,
  requestPresentationFullscreen,
  exitPresentationFullscreen,
  PresentationSessionManager,
} from '../../src/presentation/presentation-session';
import { PresentationMode } from '../../src/presentation/PresentationMode';
import * as processorModule from '../../src/presentation/processor';

describe('Presentation Session & Mode', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('UI State Capture', () => {
    it('captures previous editorial UI state accurately', () => {
      const state = capturePreviousUiState({
        viewMode: 'split',
        leftOpen: true,
        rightOpen: false,
        cursorLine: 42,
        cursorCol: 7,
        editorScrollTop: 350,
        previewScrollTop: 420,
        focusedRegion: 'editor',
      });

      expect(state).toEqual({
        viewMode: 'split',
        leftSidebarVisible: true,
        rightSidebarVisible: false,
        cursorFrom: 42,
        cursorTo: 7,
        editorScrollTop: 350,
        previewScrollTop: 420,
        focusedRegion: 'editor',
      });
    });

    it('supplies safe defaults for missing optional values', () => {
      const state = capturePreviousUiState({
        viewMode: 'source',
        leftOpen: false,
        rightOpen: false,
      });

      expect(state.cursorFrom).toBe(1);
      expect(state.cursorTo).toBe(1);
      expect(state.editorScrollTop).toBe(0);
      expect(state.previewScrollTop).toBe(0);
      expect(state.focusedRegion).toBeNull();
    });
  });

  describe('Fullscreen Helpers', () => {
    it('handles requestFullscreen and exitFullscreen safely without exceptions', async () => {
      const reqRes = await requestPresentationFullscreen();
      expect(typeof reqRes).toBe('boolean');

      const exitRes = await exitPresentationFullscreen();
      expect(typeof exitRes).toBe('boolean');
    });
  });

  describe('PresentationSessionManager Lifecycle', () => {
    it('manages transition states and preserves previousUiState', () => {
      const manager = new PresentationSessionManager();
      expect(manager.getSession().status).toBe('idle');

      const prevState = capturePreviousUiState({
        viewMode: 'source',
        leftOpen: true,
        rightOpen: true,
      });

      manager.start('doc-1', prevState);
      expect(manager.getSession().status).toBe('preparing');
      expect(manager.getSession().documentId).toBe('doc-1');
      expect(manager.getSession().sourceRevision).toBe(1);

      manager.setReady(10);
      expect(manager.getSession().status).toBe('presenting');
      expect(manager.getSession().totalSlides).toBe(10);

      manager.setCurrentSlide(3);
      expect(manager.getSession().currentSlide).toBe(3);

      const returnedPrevState = manager.close();
      expect(returnedPrevState).toEqual(prevState);
      expect(manager.getSession().status).toBe('idle');
      expect(manager.getSession().documentId).toBeNull();
    });

    it('records error state properly', () => {
      const manager = new PresentationSessionManager();
      manager.setError({
        code: 'COMPILATION_ERROR',
        message: 'Falha grave no parser',
        recoverable: true,
      });

      expect(manager.getSession().status).toBe('error');
      expect(manager.getSession().error?.message).toBe('Falha grave no parser');
    });
  });

  describe('PresentationMode Component', () => {
    it('renders nothing when isOpen is false', async () => {
      root = createRoot(container);
      await act(async () => {
        root?.render(
          <PresentationMode
            isOpen={false}
            content="# Hello"
            onClose={vi.fn()}
          />
        );
      });
      expect(container.firstChild).toBeNull();
    });

    it('renders presentation stage when presentation compiles successfully', async () => {
      const onClose = vi.fn();
      root = createRoot(container);

      await act(async () => {
        root?.render(
          <PresentationMode
            isOpen={true}
            content="# Title\n\nSlide 1\n\n## Slide 2\n\nContent 2"
            onClose={onClose}
          />
        );
      });

      // Aguarda compilação e renderização do palco Reveal
      await vi.waitFor(() => {
        const exitBtn = container.querySelector<HTMLButtonElement>('.md-presentation-exit-btn');
        expect(exitBtn).not.toBeNull();
        expect(exitBtn?.textContent).toContain('Sair');
      });

      const exitBtn = container.querySelector<HTMLButtonElement>('.md-presentation-exit-btn');
      await act(async () => {
        exitBtn?.click();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('displays error card when processing fails unexpectedly', async () => {
      vi.spyOn(processorModule, 'processPresentation').mockRejectedValue(
        new Error('Simulated processing failure')
      );

      const onClose = vi.fn();
      root = createRoot(container);

      await act(async () => {
        root?.render(
          <PresentationMode
            isOpen={true}
            content="# Crashed"
            onClose={onClose}
          />
        );
      });

      await vi.waitFor(() => {
        const errorCard = container.querySelector('.md-presentation-error-card');
        expect(errorCard).not.toBeNull();
      });

      expect(container.textContent).toContain('Simulated processing failure');

      const backBtn = container.querySelector<HTMLButtonElement>('.md-presentation-back-btn');
      expect(backBtn).not.toBeNull();

      await act(async () => {
        backBtn?.click();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
