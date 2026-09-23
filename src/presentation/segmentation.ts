import { parse as parseYaml } from 'yaml';
import type {
  PresentationModel,
  PresentationSlide,
  PresentationSource,
  PresentationWarning,
  RawSlideSegment,
} from './types';
import { parsePresentationConfig } from './config';

const SLIDE_MARKER_REGEX = /^<!--\s*md-studio:slide\s*-->$/i;
const FENCE_REGEX = /^(```|~~~)/;
const H1_REGEX = /^#\s+(.+)$/;
const H2_REGEX = /^##\s+(.+)$/;
const ANY_HEADING_REGEX = /^#{1,6}\s+(.+)$/;

interface ExtractedFrontmatter {
  data: Record<string, unknown> | null;
  rawText: string;
  endOffset: number;
}

/**
 * Extrai bloco YAML do frontmatter se presente no início do documento.
 */
export function extractFrontmatter(markdown: string): ExtractedFrontmatter {
  if (!markdown.startsWith('---')) {
    return { data: null, rawText: '', endOffset: 0 };
  }

  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: null, rawText: '', endOffset: 0 };
  }

  const rawText = match[1] ?? '';
  const endOffset = match[0].length;

  try {
    const parsed = parseYaml(rawText);
    const data = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    return { data, rawText, endOffset };
  } catch {
    return { data: null, rawText, endOffset };
  }
}

/**
 * Segmenta o Markdown em slides determinísticos respeitando:
 * 1. H2 (## ) como delimitador de slide padrão.
 * 2. <!-- md-studio:slide --> como marcador de quebra explícito.
 * 3. H1 (# ) como identidade/título do documento.
 * 4. Fenced code blocks (``` / ~~~) protegidos contra falsas quebras.
 * 5. --- preservado como <hr>, NUNCA quebrando slide.
 */
export function segmentMarkdown(markdown: string): {
  segments: RawSlideSegment[];
  documentTitle: string | null;
  frontmatter: Record<string, unknown> | null;
  warnings: PresentationWarning[];
} {
  const warnings: PresentationWarning[] = [];
  const fm = extractFrontmatter(markdown);
  const frontmatter = fm.data;

  const contentOffset = fm.endOffset;
  const content = markdown.slice(contentOffset);

  let documentTitle: string | null = null;
  if (frontmatter && typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
    documentTitle = frontmatter.title.trim();
  }

  // Se o documento estiver vazio ou contiver apenas espaços
  if (!content.trim()) {
    return {
      segments: [],
      documentTitle,
      frontmatter,
      warnings,
    };
  }

  const lines = content.split('\n');
  const segments: RawSlideSegment[] = [];

  let currentLines: string[] = [];
  let currentStartOffset = contentOffset;
  let runningOffset = contentOffset;
  let inFencedCode = false;
  let fenceChar = '';

  const flushSlide = () => {
    const rawMarkdown = currentLines.join('\n');
    if (!rawMarkdown.trim() && segments.length === 0) {
      // Ignora trecho inicial vazio antes de qualquer conteúdo
      currentLines = [];
      return;
    }

    const trimmed = rawMarkdown.trim();
    if (!trimmed) {
      currentLines = [];
      return;
    }

    // Identifica o título do slide (primeiro heading no slide)
    let slideTitle: string | null = null;
    for (const line of currentLines) {
      const headingMatch = line.trim().match(ANY_HEADING_REGEX);
      if (headingMatch && headingMatch[1]) {
        slideTitle = headingMatch[1].trim();
        break;
      }
    }

    const sourceEnd = currentStartOffset + rawMarkdown.length;
    segments.push({
      index: segments.length,
      title: slideTitle,
      sourceStart: currentStartOffset,
      sourceEnd,
      markdown: rawMarkdown,
    });

    currentLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const trimmedLine = rawLine.trim();
    const lineByteLen = rawLine.length + 1; // +1 para newline

    // Gerenciamento de blocos de código protegidos
    if (FENCE_REGEX.test(trimmedLine)) {
      const currentFence = trimmedLine.slice(0, 3);
      if (!inFencedCode) {
        inFencedCode = true;
        fenceChar = currentFence;
      } else if (currentFence === fenceChar) {
        inFencedCode = false;
        fenceChar = '';
      }
      currentLines.push(rawLine);
      runningOffset += lineByteLen;
      continue;
    }

    if (inFencedCode) {
      currentLines.push(rawLine);
      runningOffset += lineByteLen;
      continue;
    }

    // Se encontramos H1 no início do documento e ainda não temos documentTitle
    if (!documentTitle) {
      const h1Match = trimmedLine.match(H1_REGEX);
      if (h1Match && h1Match[1]) {
        documentTitle = h1Match[1].trim();
      }
    }

    // 1. Quebra explícita <!-- md-studio:slide -->
    if (SLIDE_MARKER_REGEX.test(trimmedLine)) {
      flushSlide();
      currentStartOffset = runningOffset + lineByteLen;
      runningOffset += lineByteLen;
      continue;
    }

    // 2. Quebra por H2 (## )
    if (H2_REGEX.test(trimmedLine)) {
      if (currentLines.some((l) => l.trim().length > 0)) {
        flushSlide();
        currentStartOffset = runningOffset;
      }
      currentLines.push(rawLine);
      runningOffset += lineByteLen;
      continue;
    }

    currentLines.push(rawLine);
    runningOffset += lineByteLen;
  }

  // Descarrega o último slide
  flushSlide();

  return {
    segments,
    documentTitle,
    frontmatter,
    warnings,
  };
}

/**
 * Constrói o PresentationModel completo a partir do PresentationSource.
 */
export function createPresentationModel(source: PresentationSource): PresentationModel {
  const { segments, documentTitle, frontmatter, warnings: segWarnings } = segmentMarkdown(source.markdown);
  const { config, warnings: configWarnings } = parsePresentationConfig(frontmatter);

  const warnings = [...segWarnings, ...configWarnings];

  if (segments.length === 0) {
    warnings.push({
      code: 'empty_document',
      slideIndex: null,
      message: 'Este documento não possui conteúdo para apresentação.',
    });
  }

  const slides: PresentationSlide[] = segments.map((seg, idx) => ({
    id: `slide-${idx + 1}`,
    index: idx,
    title: seg.title,
    sourceStart: seg.sourceStart,
    sourceEnd: seg.sourceEnd,
    markdown: seg.markdown,
  }));

  const metadata = {
    title: documentTitle,
    theme: config.theme,
    transition: config.transition,
    slideNumbers: config.slideNumbers,
    controls: config.controls,
    progress: config.progress,
  };

  return {
    metadata,
    slides,
    warnings,
  };
}
