/**
 * Utilitários de acessibilidade, resolução de tema e reduced motion
 * para o Presentation Mode (MD-PRES-006 / v0.2.3)
 */

export type PresentationTheme = 'auto' | 'light' | 'dark';
export type PresentationTransition = 'none' | 'fade' | 'slide';

/**
 * Detecta se o ambiente do usuário solicita redução de movimento (prefers-reduced-motion).
 */
export function detectPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Resolve o tema efetivo da apresentação com base na configuração do frontmatter,
 * no tema atual do MD Studio e na preferência de sistema do usuário.
 */
export function resolveEffectiveTheme(
  configTheme: PresentationTheme,
  appTheme: 'auto' | 'light' | 'dark' = 'auto'
): 'light' | 'dark' {
  if (configTheme === 'light' || configTheme === 'dark') {
    return configTheme;
  }

  if (appTheme === 'light' || appTheme === 'dark') {
    return appTheme;
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  }

  return 'dark';
}

/**
 * Retorna a transição segura para apresentação.
 * Se o usuário tiver prefers-reduced-motion ativado, força 'none' para evitar náusea e desconforto visual.
 */
export function getAccessibleTransition(
  requestedTransition: PresentationTransition,
  prefersReducedMotion?: boolean
): PresentationTransition {
  const isReduced = prefersReducedMotion ?? detectPrefersReducedMotion();
  if (isReduced) {
    return 'none';
  }
  return requestedTransition;
}
