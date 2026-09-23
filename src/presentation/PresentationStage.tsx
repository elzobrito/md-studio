import React, { useEffect, useRef } from 'react';
import type { PresentationModel } from './types';
import { createPresentationDeck, type DeckController } from './presentation-deck';
import { enhancePresentationContent } from './rich-content';
import { resolveEffectiveTheme, getAccessibleTransition } from './presentation-theme';
import './presentation.css';

export interface PresentationStageProps {
  model: PresentationModel;
  appTheme?: 'auto' | 'light' | 'dark';
  initialSlide?: number;
  onExit: () => void;
  onSlideChange?: (index: number) => void;
}

export const PresentationStage: React.FC<PresentationStageProps> = ({
  model,
  appTheme = 'dark',
  initialSlide = 0,
  onExit,
  onSlideChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<DeckController | null>(null);

  // Determina o tema e a transição acessíveis
  const effectiveTheme = resolveEffectiveTheme(model.metadata.theme, appTheme);
  const accessibleTransition = getAccessibleTransition(model.metadata.transition);

  useEffect(() => {
    let cancelled = false;

    const initDeck = async () => {
      if (!containerRef.current) return;
      try {
        // Enriquecimento assíncrono de diagramas Mermaid, fallback de imagens e badges de código
        await enhancePresentationContent(containerRef.current, {
          isDark: effectiveTheme === 'dark',
        });

        if (cancelled) return;

        const controller = await createPresentationDeck(
          containerRef.current,
          {
            theme: model.metadata.theme,
            transition: accessibleTransition,
            slideNumbers: model.metadata.slideNumbers,
            controls: model.metadata.controls,
            progress: model.metadata.progress,
          },
          initialSlide,
          onSlideChange
        );

        if (cancelled) {
          controller.destroy();
        } else {
          deckRef.current = controller;
          controller.layout();
        }
      } catch (err) {
        console.error('Falha ao inicializar Reveal.js deck:', err);
      }
    };

    void initDeck();

    // Listener global de teclado para saída por F5 ou Escape
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onExit();
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      if (deckRef.current) {
        deckRef.current.destroy();
        deckRef.current = null;
      }
    };
  }, [model, initialSlide, onExit, onSlideChange]);

  return (
    <div
      className={`md-presentation-overlay theme-${effectiveTheme}`}
      role="region"
      aria-label="Modo de Apresentação"
    >
      <button
        type="button"
        className="md-presentation-exit-btn"
        onClick={onExit}
        aria-label="Sair da apresentação"
      >
        ✕ Sair (F5 / Esc)
      </button>

      <div className="reveal" ref={containerRef}>
        <div className="slides">
          {model.slides.map((slide) => (
            <section
              key={slide.id}
              data-slide-id={slide.id}
              dangerouslySetInnerHTML={{ __html: slide.html || '' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
