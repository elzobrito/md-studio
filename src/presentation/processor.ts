import { processMarkdown, type ProcessOptions } from '../markdown/processor';
import { createPresentationModel } from './segmentation';
import type { PresentationModel, PresentationSource } from './types';

export interface PresentationProcessOptions extends ProcessOptions {
  // Configurações adicionais de processamento de slides se necessário
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Processa a fonte da apresentação:
 * 1. Segmenta o Markdown em slides determinísticos e analisa a configuração do frontmatter.
 * 2. Compila cada slide através do pipeline Unified/Remark/Rehype existente do MD Studio.
 * 3. Sanitiza e embute Shiki, KaTeX, diagramas Mermaid e alertas.
 * 4. Trata erros por slide sem interromper a apresentação inteira.
 */
export async function processPresentation(
  source: PresentationSource,
  options: PresentationProcessOptions = {}
): Promise<PresentationModel> {
  const model = createPresentationModel(source);

  await Promise.all(
    model.slides.map(async (slide) => {
      try {
        const result = await processMarkdown(slide.markdown, options);
        slide.html = result.html;
        if (result.diagnostics.length > 0) {
          for (const diag of result.diagnostics) {
            model.warnings.push({
              code: 'slide_diagnostic',
              slideIndex: slide.index,
              message: diag,
            });
          }
        }
      } catch (err) {
        model.warnings.push({
          code: 'slide_process_error',
          slideIndex: slide.index,
          message: err instanceof Error ? err.message : String(err),
        });
        slide.html = `<div class="slide-error-fallback"><pre>${escapeHtml(slide.markdown)}</pre></div>`;
      }
    })
  );

  return model;
}
