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
 * Reveal.js agenda, após `initialize()`, um `setTimeout(1ms)` que dispara o
 * evento `ready` via `document.createEvent` **sem** verificar se `destroy()`
 * já rodou. Se o deck for destruído nesse intervalo (unmount rápido / teardown
 * de teste), o callback estoura com `ReferenceError: document is not defined`
 * quando o ambiente jsdom já foi descartado.
 *
 * Flush explícito desse tick antes de devolver o controller garante que o
 * timeout interno rode enquanto o DOM ainda existe.
 */
function flushRevealReadyTick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 2);
  });
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

  const onWheel = (event: WheelEvent) => {
    const section = rootElement.querySelector<HTMLElement>('section.present');
    if (!section) return;
    const overflows = section.scrollHeight > section.clientHeight + 4;
    if (!overflows || event.deltaY === 0) return;
    const maxScroll = section.scrollHeight - section.clientHeight;
    const next = Math.min(maxScroll, Math.max(0, section.scrollTop + event.deltaY));
    if (next === section.scrollTop) return;
    section.scrollTop = next;
    event.preventDefault();
  };
  rootElement.addEventListener('wheel', onWheel, { passive: false });

  await deck.initialize();
  await flushRevealReadyTick();

  if (initialSlide > 0) {
    deck.slide(initialSlide);
  }

  let destroyed = false;

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      try {
        rootElement.removeEventListener('wheel', onWheel);
        deck.off('slidechanged', slideChangeListener);
        deck.destroy();
      } catch {
        // Fallback defensivo caso o deck já tenha sido descartado
      }
    },
    next() {
      if (!destroyed) deck.next();
    },
    prev() {
      if (!destroyed) deck.prev();
    },
    slide(index: number) {
      if (!destroyed) deck.slide(index);
    },
    getCurrentIndex() {
      if (destroyed) return 0;
      return deck.getIndices().h;
    },
    getTotalSlides() {
      if (destroyed) return 0;
      return deck.getTotalSlides();
    },
    layout() {
      if (destroyed) return;
      try {
        deck.layout();
      } catch {
        // safe
      }
    },
  };
}
