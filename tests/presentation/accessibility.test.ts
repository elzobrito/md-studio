import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectPrefersReducedMotion,
  resolveEffectiveTheme,
  getAccessibleTransition,
} from '../../src/presentation/presentation-theme';
import { PresentationMode } from '../../src/presentation/PresentationMode';

describe('Presentation Accessibility & Themes (MD-PRES-006)', () => {
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

  describe('Reduced Motion Detection', () => {
    it('detects when prefers-reduced-motion is active', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(detectPrefersReducedMotion()).toBe(true);
    });

    it('forces transition to none when reduced motion is requested', () => {
      expect(getAccessibleTransition('slide', true)).toBe('none');
      expect(getAccessibleTransition('fade', true)).toBe('none');
      expect(getAccessibleTransition('none', true)).toBe('none');
    });

    it('preserves requested transition when reduced motion is not requested', () => {
      expect(getAccessibleTransition('slide', false)).toBe('slide');
      expect(getAccessibleTransition('fade', false)).toBe('fade');
      expect(getAccessibleTransition('none', false)).toBe('none');
    });
  });

  describe('Effective Theme Resolution', () => {
    it('prioritizes explicit frontmatter presentation theme', () => {
      expect(resolveEffectiveTheme('light', 'dark')).toBe('light');
      expect(resolveEffectiveTheme('dark', 'light')).toBe('dark');
    });

    it('falls back to app theme when frontmatter theme is auto', () => {
      expect(resolveEffectiveTheme('auto', 'light')).toBe('light');
      expect(resolveEffectiveTheme('auto', 'dark')).toBe('dark');
    });

    it('resolves system color scheme when both frontmatter and app themes are auto', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-color-scheme: light'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(resolveEffectiveTheme('auto', 'auto')).toBe('light');
    });
  });

  describe('Empty Presentation Graceful State', () => {
    it('renders accessible empty document card when document contains no slide content', async () => {
      const onClose = vi.fn();
      root = createRoot(container);

      await act(async () => {
        root?.render(
          React.createElement(PresentationMode, {
            isOpen: true,
            content: '',
            onClose,
          })
        );
      });

      await vi.waitFor(() => {
        const emptyCard = container.querySelector('.md-presentation-empty-card');
        expect(emptyCard).not.toBeNull();
      });

      expect(container.textContent).toContain('Este documento não possui conteúdo para apresentação.');

      const backBtn = container.querySelector<HTMLButtonElement>('.md-presentation-back-btn');
      expect(backBtn).not.toBeNull();

      await act(async () => {
        backBtn?.click();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
