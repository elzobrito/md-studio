import { describe, expect, it, vi } from 'vitest';
import { createPresentationDeck } from '../../src/presentation/presentation-deck';
import { DEFAULT_PRESENTATION_CONFIG } from '../../src/presentation/config';

describe('Presentation Deck Lifecycle', () => {
  it('instantiates and destroys Reveal.js deck cleanly', async () => {
    const container = document.createElement('div');
    container.className = 'reveal';
    const slides = document.createElement('div');
    slides.className = 'slides';
    const section = document.createElement('section');
    section.innerHTML = '<h1>Slide 1</h1>';
    slides.appendChild(section);
    container.appendChild(slides);
    document.body.appendChild(container);

    const onSlideChanged = vi.fn();
    const controller = await createPresentationDeck(
      container,
      DEFAULT_PRESENTATION_CONFIG,
      0,
      onSlideChanged
    );

    expect(controller).toBeDefined();
    expect(typeof controller.destroy).toBe('function');
    expect(typeof controller.next).toBe('function');
    expect(typeof controller.prev).toBe('function');
    expect(typeof controller.layout).toBe('function');

    // Teardown
    controller.destroy();
    document.body.removeChild(container);
  });
});
