import type { PresentationConfig } from './types';

export interface DeckController {
  destroy(): void;
  next(): void;
  prev(): void;
  slide(index: number): void;
  getCurrentIndex(): number;
  getTotalSlides(): number;
  layout(): void;
}

/**
 * Inicializa a instância local do Reveal.js de forma lazy e encapsulada.
 */
export async function createPresentationDeck(
  rootElement: HTMLElement,
  config: PresentationConfig,
  initialSlide = 0,
  onSlideChanged?: (index: number) => void
): Promise<DeckController> {
  // Carregamento lazy do Reveal.js sem CDN
  const { default: Reveal } = await import('reveal.js');

  const deck = new Reveal(rootElement, {
    embedded: true,
    keyboard: true,
    overview: false,
    controls: config.controls,
    progress: config.progress,
    slideNumber: config.slideNumbers ? 'c/t' : false,
    transition: config.transition === 'none' ? 'none' : config.transition,
    hash: false,
    history: false,
    center: false,
    margin: 0.08,
    minScale: 0.2,
    maxScale: 2.0,
  });

  const slideChangeListener = (event: any) => {
    const idx = typeof event.indexh === 'number' ? event.indexh : 0;
    onSlideChanged?.(idx);
  };

  deck.on('slidechanged', slideChangeListener);

  await deck.initialize();

  if (initialSlide > 0) {
    deck.slide(initialSlide);
  }

  return {
    destroy() {
      try {
        deck.off('slidechanged', slideChangeListener);
        deck.destroy();
      } catch {
        // Fallback defensivo caso o deck já tenha sido descartado
      }
    },
    next() {
      deck.next();
    },
    prev() {
      deck.prev();
    },
    slide(index: number) {
      deck.slide(index);
    },
    getCurrentIndex() {
      return deck.getIndices().h;
    },
    getTotalSlides() {
      return deck.getTotalSlides();
    },
    layout() {
      try {
        deck.layout();
      } catch {
        // safe
      }
    },
  };
}
