import type { PresentationConfig, PresentationWarning } from './types';

export const DEFAULT_PRESENTATION_CONFIG: PresentationConfig = {
  theme: 'auto',
  transition: 'fade',
  slideNumbers: true,
  controls: true,
  progress: true,
};

const VALID_THEMES = new Set(['auto', 'light', 'dark']);
const VALID_TRANSITIONS = new Set(['none', 'fade', 'slide']);

/**
 * Faz o parsing e validação da configuração de apresentação a partir do frontmatter do documento.
 * Valores ausentes ou inválidos recebem defaults seguros e geram warnings locais.
 */
export function parsePresentationConfig(
  frontmatter: Record<string, unknown> | null | undefined
): { config: PresentationConfig; warnings: PresentationWarning[] } {
  const warnings: PresentationWarning[] = [];
  const config: PresentationConfig = { ...DEFAULT_PRESENTATION_CONFIG };

  if (!frontmatter || typeof frontmatter !== 'object') {
    return { config, warnings };
  }

  // A configuração pode vir sob o bloco 'presentation' ou diretamente na raiz do frontmatter
  const rawPres =
    frontmatter.presentation && typeof frontmatter.presentation === 'object'
      ? (frontmatter.presentation as Record<string, unknown>)
      : frontmatter;

  // 1. Theme
  if ('theme' in rawPres) {
    const val = rawPres.theme;
    if (typeof val === 'string' && VALID_THEMES.has(val.toLowerCase())) {
      config.theme = val.toLowerCase() as PresentationConfig['theme'];
    } else {
      warnings.push({
        code: 'invalid_theme',
        slideIndex: null,
        message: `Tema de apresentação desconhecido ou inválido ("${String(val)}"); usando padrão "${DEFAULT_PRESENTATION_CONFIG.theme}".`,
      });
      config.theme = DEFAULT_PRESENTATION_CONFIG.theme;
    }
  }

  // 2. Transition
  if ('transition' in rawPres) {
    const val = rawPres.transition;
    if (typeof val === 'string' && VALID_TRANSITIONS.has(val.toLowerCase())) {
      config.transition = val.toLowerCase() as PresentationConfig['transition'];
    } else {
      warnings.push({
        code: 'invalid_transition',
        slideIndex: null,
        message: `Transição desconhecida ou inválida ("${String(val)}"); usando padrão "${DEFAULT_PRESENTATION_CONFIG.transition}".`,
      });
      config.transition = DEFAULT_PRESENTATION_CONFIG.transition;
    }
  }

  // 3. Slide Numbers
  if ('slideNumbers' in rawPres) {
    const val = rawPres.slideNumbers;
    if (typeof val === 'boolean') {
      config.slideNumbers = val;
    } else {
      warnings.push({
        code: 'invalid_slide_numbers',
        slideIndex: null,
        message: `Valor inválido para slideNumbers ("${String(val)}"); usando padrão ${DEFAULT_PRESENTATION_CONFIG.slideNumbers}.`,
      });
      config.slideNumbers = DEFAULT_PRESENTATION_CONFIG.slideNumbers;
    }
  }

  // 4. Controls
  if ('controls' in rawPres) {
    const val = rawPres.controls;
    if (typeof val === 'boolean') {
      config.controls = val;
    } else {
      warnings.push({
        code: 'invalid_controls',
        slideIndex: null,
        message: `Valor inválido para controls ("${String(val)}"); usando padrão ${DEFAULT_PRESENTATION_CONFIG.controls}.`,
      });
      config.controls = DEFAULT_PRESENTATION_CONFIG.controls;
    }
  }

  // 5. Progress
  if ('progress' in rawPres) {
    const val = rawPres.progress;
    if (typeof val === 'boolean') {
      config.progress = val;
    } else {
      warnings.push({
        code: 'invalid_progress',
        slideIndex: null,
        message: `Valor inválido para progress ("${String(val)}"); usando padrão ${DEFAULT_PRESENTATION_CONFIG.progress}.`,
      });
      config.progress = DEFAULT_PRESENTATION_CONFIG.progress;
    }
  }

  return { config, warnings };
}
