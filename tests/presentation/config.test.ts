import { describe, expect, it } from 'vitest';
import { DEFAULT_PRESENTATION_CONFIG, parsePresentationConfig } from '../../src/presentation/config';

describe('Presentation Config Parser', () => {
  it('returns default config when frontmatter is null or empty', () => {
    const res1 = parsePresentationConfig(null);
    expect(res1.config).toEqual(DEFAULT_PRESENTATION_CONFIG);
    expect(res1.warnings).toHaveLength(0);

    const res2 = parsePresentationConfig({});
    expect(res2.config).toEqual(DEFAULT_PRESENTATION_CONFIG);
    expect(res2.warnings).toHaveLength(0);
  });

  it('parses valid presentation object within frontmatter', () => {
    const fm = {
      title: 'Minha Apresentação',
      presentation: {
        theme: 'dark',
        transition: 'slide',
        slideNumbers: false,
        controls: false,
        progress: false,
      },
    };
    const { config, warnings } = parsePresentationConfig(fm);
    expect(warnings).toHaveLength(0);
    expect(config).toEqual({
      theme: 'dark',
      transition: 'slide',
      slideNumbers: false,
      controls: false,
      progress: false,
    });
  });

  it('parses valid top-level keys if presentation object is omitted', () => {
    const fm = {
      title: 'Minha Apresentação',
      theme: 'light',
      transition: 'none',
    };
    const { config, warnings } = parsePresentationConfig(fm);
    expect(warnings).toHaveLength(0);
    expect(config.theme).toBe('light');
    expect(config.transition).toBe('none');
    expect(config.slideNumbers).toBe(true);
  });

  it('generates warnings and safe defaults for invalid config values', () => {
    const fm = {
      presentation: {
        theme: 'neon-cyberpunk',
        transition: 'cube-3d',
        slideNumbers: 'yes',
        controls: 123,
        progress: 'maybe',
      },
    };
    const { config, warnings } = parsePresentationConfig(fm);
    expect(warnings.length).toBe(5);
    expect(warnings.map((w) => w.code)).toEqual([
      'invalid_theme',
      'invalid_transition',
      'invalid_slide_numbers',
      'invalid_controls',
      'invalid_progress',
    ]);
    expect(config).toEqual(DEFAULT_PRESENTATION_CONFIG);
  });
});
