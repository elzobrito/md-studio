import { renderMermaid } from '../markdown/mermaid';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renderiza todos os containers de diagramas Mermaid dentro da apresentação.
 * Segue o princípio de isolamento de falhas: se a sintaxe for inválida, exibe o código fonte
 * com um badge de erro amigável sem derrubar o slide nem a apresentação.
 */
export async function renderMermaidInPresentation(
  container: HTMLElement,
  isDark: boolean = true
): Promise<void> {
  const elements = container.querySelectorAll<HTMLElement>('.mermaid-diagram-container');

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.dataset.rendered === 'true') continue;

    const rawCode = el.dataset.mermaidCode || el.textContent || '';
    const trimmed = rawCode.trim();

    if (!trimmed) {
      el.dataset.rendered = 'empty';
      continue;
    }

    try {
      const res = await renderMermaid(`pres-mmd-${i}`, trimmed, {
        isDark,
        theme: isDark ? 'dark' : 'neutral',
      });

      if (res.svg) {
        el.innerHTML = res.svg;
        el.dataset.rendered = 'true';
        el.classList.add('mermaid-rendered');
      } else if (res.error) {
        el.dataset.rendered = 'error';
        el.innerHTML = `
          <div class="mermaid-presentation-error" role="alert">
            <div class="mermaid-error-badge">⚠️ Diagrama Mermaid com sintaxe inválida: ${escapeHtml(res.error)}</div>
            <pre class="mermaid-code-fallback"><code>${escapeHtml(trimmed)}</code></pre>
          </div>
        `.trim();
      }
    } catch (err) {
      el.dataset.rendered = 'error';
      const msg = err instanceof Error ? err.message : String(err);
      el.innerHTML = `
        <div class="mermaid-presentation-error" role="alert">
          <div class="mermaid-error-badge">⚠️ Erro ao renderizar diagrama: ${escapeHtml(msg)}</div>
          <pre class="mermaid-code-fallback"><code>${escapeHtml(trimmed)}</code></pre>
        </div>
      `.trim();
    }
  }
}

/**
 * Cria o elemento visual de fallback para imagens ausentes ou quebradas.
 */
export function createMissingImagePlaceholder(src: string, alt?: string): HTMLElement {
  const fallback = document.createElement('div');
  fallback.className = 'presentation-image-fallback';
  fallback.setAttribute('role', 'figure');
  fallback.setAttribute('aria-label', alt || 'Imagem não encontrada');

  const icon = document.createElement('div');
  icon.className = 'fallback-icon';
  icon.textContent = '🖼️';

  const title = document.createElement('div');
  title.className = 'fallback-title';
  title.textContent = '[Imagem não encontrada]';

  const srcDisplay = document.createElement('div');
  srcDisplay.className = 'fallback-src';
  srcDisplay.textContent = src || '(caminho vazio)';

  fallback.appendChild(icon);
  fallback.appendChild(title);
  fallback.appendChild(srcDisplay);

  if (alt && alt.trim() !== '') {
    const altDisplay = document.createElement('div');
    altDisplay.className = 'fallback-alt';
    altDisplay.textContent = `Alt: ${alt}`;
    fallback.appendChild(altDisplay);
  }

  return fallback;
}

/**
 * Trata imagens ausentes ou corrompidas no deck de slides.
 * Garante que em vez de um ícone quebrado do navegador, o apresentador veja
 * um placeholder explícito com o caminho do asset.
 */
export function handleMissingImagesInPresentation(container: HTMLElement): void {
  const images = container.querySelectorAll<HTMLImageElement>('img');

  images.forEach((img) => {
    // Configura lazy loading para não sobrecarregar rendering
    if (!img.getAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }

    const replaceWithErrorFallback = () => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const fallback = createMissingImagePlaceholder(src, alt);
      if (img.parentNode) {
        img.parentNode.replaceChild(fallback, img);
      }
    };

    // Se já estiver quebrada no momento da verificação
    if (img.complete && img.naturalWidth === 0 && img.src) {
      replaceWithErrorFallback();
      return;
    }

    img.addEventListener('error', replaceWithErrorFallback, { once: true });
  });
}

/**
 * Adiciona badges de linguagem e controle de scroll a blocos de código na apresentação.
 */
export function decoratePresentationCodeBlocks(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll<HTMLPreElement>('pre');

  codeBlocks.forEach((pre) => {
    // Ignora fallback de erro ou mermaid
    if (pre.classList.contains('mermaid-code-fallback') || pre.closest('.slide-error-fallback')) {
      return;
    }

    // Evita duplicar decorações
    if (pre.dataset.decorated === 'true') {
      return;
    }
    pre.dataset.decorated = 'true';

    // Determina a linguagem do bloco
    let lang = pre.getAttribute('data-language') || '';
    if (!lang) {
      const codeChild = pre.querySelector('code');
      if (codeChild) {
        const classes = Array.from(codeChild.classList);
        const langClass = classes.find((c) => c.startsWith('language-'));
        if (langClass) {
          lang = langClass.replace('language-', '');
        }
      }
    }
    if (!lang) {
      const classes = Array.from(pre.classList);
      const langClass = classes.find((c) => c.startsWith('language-'));
      if (langClass) {
        lang = langClass.replace('language-', '');
      }
    }

    if (lang && lang !== 'code') {
      const badge = document.createElement('span');
      badge.className = 'presentation-code-badge';
      badge.textContent = lang;
      pre.style.position = 'relative';
      pre.appendChild(badge);
    }
  });
}

/**
 * Aplica todas as melhorias e integrações de conteúdo rico no container da apresentação.
 */
export async function enhancePresentationContent(
  container: HTMLElement,
  options: { isDark?: boolean } = {}
): Promise<void> {
  decoratePresentationCodeBlocks(container);
  handleMissingImagesInPresentation(container);
  await renderMermaidInPresentation(container, options.isDark ?? true);
}
