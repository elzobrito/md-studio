/**
 * importFidelity.ts - Contrato estático e metadados de FidelityClass
 * Conforme especificação 045-import-fidelity-classes.md
 *
 * Regra: Desacoplado de scores numéricos, avaliações subjetivas ou IA.
 * Metadata estática por combinação provider + formato.
 */

export type FidelityClass = 'high' | 'intermediate' | 'best-effort' | 'unknown';

export type FidelityBasis = 'provider-format-metadata' | 'unknown';

export interface FidelityDescriptor {
  class: FidelityClass;
  label: string;
  explanation: string;
  formatId: string;
  basis: FidelityBasis;
}

export const FIDELITY_LABELS: Record<FidelityClass, string> = {
  high: 'Alta',
  intermediate: 'Intermediária',
  'best-effort': 'Best effort',
  unknown: 'Desconhecida',
};

export const FIDELITY_EXPLANATIONS: Record<FidelityClass, string> = {
  high: 'A estrutura do documento tende a ser preservada de forma consistente em Markdown. Elementos visuais, layout e recursos não representáveis ainda podem exigir revisão.',
  intermediate: 'O conteúdo principal e parte da estrutura tendem a ser preservados, mas organização, tabelas, ordem ou elementos específicos podem exigir ajustes após a importação.',
  'best-effort': 'A conversão prioriza recuperar conteúdo útil. Estrutura, ordem de leitura e elementos visuais podem variar significativamente; revise o resultado com atenção.',
  unknown: 'Não há uma expectativa de fidelidade definida para esta combinação de formato e conversor. Revise o resultado antes de criar o Markdown.',
};

/**
 * Mapeamento canônico da especificação 045:
 * - High: HTML, DOCX, EPUB
 * - Intermediate: PPTX, XLSX
 * - BestEffort: PDF
 * - Unknown: XLS, CSV, JSON, XML e qualquer outro sem metadata explícita
 */
const CANONICAL_FORMAT_MAP: Record<string, FidelityClass> = {
  html: 'high',
  htm: 'high',
  docx: 'high',
  epub: 'high',
  pptx: 'intermediate',
  xlsx: 'intermediate',
  pdf: 'best-effort',
  // Lacunas normativas congeladas explicitamente como Unknown:
  xls: 'unknown',
  csv: 'unknown',
  json: 'unknown',
  xml: 'unknown',
};

/**
 * Normaliza a extensão ou formatId para busca uniforme (minúsculo, sem ponto inicial)
 */
export function normalizeFormatId(format: string): string {
  if (!format) return '';
  return format.trim().toLowerCase().replace(/^\./, '');
}

/**
 * Retorna o descritor de fidelidade para um formato e provider.
 * Se não houver classificação canônica registrada, retorna classe 'unknown' com basis 'unknown'.
 */
export function getFidelityDescriptor(
  format: string,
  _providerId?: string,
  _version?: string
): FidelityDescriptor {
  const normalized = normalizeFormatId(format);
  const matchedClass = CANONICAL_FORMAT_MAP[normalized];

  if (matchedClass && matchedClass !== 'unknown') {
    return {
      class: matchedClass,
      label: FIDELITY_LABELS[matchedClass],
      explanation: FIDELITY_EXPLANATIONS[matchedClass],
      formatId: normalized,
      basis: 'provider-format-metadata',
    };
  }

  return {
    class: 'unknown',
    label: FIDELITY_LABELS.unknown,
    explanation: FIDELITY_EXPLANATIONS.unknown,
    formatId: normalized,
    basis: 'unknown',
  };
}

/**
 * Lista todas as classes de fidelidade suportadas pelo sistema
 */
export function getAllFidelityClasses(): FidelityClass[] {
  return ['high', 'intermediate', 'best-effort', 'unknown'];
}
