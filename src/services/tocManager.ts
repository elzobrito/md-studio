import { slugify } from './navigation';

export const TOC_START_MARKER = '<!-- md-studio:toc:start -->';
export const TOC_END_MARKER = '<!-- md-studio:toc:end -->';

export interface TocHeading {
  level: number;
  text: string;
  id: string;
  line: number;
}

export interface TocManagedRegion {
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
  startLine: number;
  endLine: number;
}

export interface TocCandidate {
  from: number;
  to: number;
  startLine: number;
  endLine: number;
  items: string[];
}

export interface TocMarkerIssue {
  message: string;
  line?: number;
}

export type TocState =
  | { kind: 'none' }
  | { kind: 'managed'; region: TocManagedRegion }
  | { kind: 'manual-candidate'; candidates: TocCandidate[] }
  | { kind: 'malformed'; issues: TocMarkerIssue[] }
  | { kind: 'ambiguous'; regions: TocManagedRegion[] };

export interface TocOptions {
  maxDepth?: number; // 1..6, default 3
}

export interface TocEditResult {
  newMarkdown: string;
  changeFrom: number;
  changeTo: number;
  insertText: string;
}

/**
 * Extracts headings from Markdown content, strictly ignoring headings
 * located inside YAML frontmatter and code fences.
 * Reuses canonical slugify + occurrence deduplication matching preview renderer.
 */
export function extractTocHeadings(markdown: string): TocHeading[] {
  const lines = markdown.split(/\r?\n/);
  const headings: TocHeading[] = [];
  const seenSlugs = new Map<string, number>();

  let inFrontmatter = false;
  let inCodeFence = false;
  let fenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const trimmed = rawLine.trim();

    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = false;
      }
      continue;
    }

    const fenceMatch = rawLine.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[2] ?? '';
      if (!inCodeFence) {
        inCodeFence = true;
        fenceMarker = marker[0] ?? '`';
      } else if (marker.startsWith(fenceMarker)) {
        inCodeFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inCodeFence) {
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(rawLine);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/#+\s*$/, '').trim();
      const base = slugify(text) || 'section';
      const count = seenSlugs.get(base) ?? 0;
      seenSlugs.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count}`;
      headings.push({
        level,
        text,
        id,
        line: i + 1,
      });
    }
  }

  return headings;
}

/**
 * Analyzes markdown for managed TOC markers (<!-- md-studio:toc:start/end -->)
 * or unmanaged manual TOC candidates.
 */
export function analyzeTocState(markdown: string): TocState {
  const lines = markdown.split(/\r?\n/);
  const startOccurrences: { line: number; from: number; to: number }[] = [];
  const endOccurrences: { line: number; from: number; to: number }[] = [];

  let inFrontmatter = false;
  let inCodeFence = false;
  let fenceMarker = '';
  let currentOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const trimmed = rawLine.trim();
    const lineLen = rawLine.length + 1; // including newline

    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      currentOffset += lineLen;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === '---') inFrontmatter = false;
      currentOffset += lineLen;
      continue;
    }

    const fenceMatch = rawLine.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[2] ?? '';
      if (!inCodeFence) {
        inCodeFence = true;
        fenceMarker = marker[0] ?? '`';
      } else if (marker.startsWith(fenceMarker)) {
        inCodeFence = false;
        fenceMarker = '';
      }
      currentOffset += lineLen;
      continue;
    }
    if (inCodeFence) {
      currentOffset += lineLen;
      continue;
    }

    const startIdx = rawLine.indexOf(TOC_START_MARKER);
    if (startIdx !== -1) {
      startOccurrences.push({
        line: i + 1,
        from: currentOffset + startIdx,
        to: currentOffset + startIdx + TOC_START_MARKER.length,
      });
    }

    const endIdx = rawLine.indexOf(TOC_END_MARKER);
    if (endIdx !== -1) {
      endOccurrences.push({
        line: i + 1,
        from: currentOffset + endIdx,
        to: currentOffset + endIdx + TOC_END_MARKER.length,
      });
    }

    currentOffset += lineLen;
  }

  // Check for malformed or mismatched markers
  if (startOccurrences.length === 0 && endOccurrences.length > 0) {
    return {
      kind: 'malformed',
      issues: [{ message: 'Marcador de fim de TOC encontrado sem marcador de início correspondente', line: endOccurrences[0].line }],
    };
  }

  if (startOccurrences.length > 0 && endOccurrences.length === 0) {
    return {
      kind: 'malformed',
      issues: [{ message: 'Marcador de início de TOC encontrado sem marcador de fim correspondente', line: startOccurrences[0].line }],
    };
  }

  if (startOccurrences.length === 1 && endOccurrences.length === 1) {
    const start = startOccurrences[0];
    const end = endOccurrences[0];
    if (start.from >= end.from) {
      return {
        kind: 'malformed',
        issues: [{ message: 'Marcador de fim precede o marcador de início', line: end.line }],
      };
    }

    return {
      kind: 'managed',
      region: {
        from: start.from,
        to: end.to,
        contentFrom: start.to,
        contentTo: end.from,
        startLine: start.line,
        endLine: end.line,
      },
    };
  }

  if (startOccurrences.length > 1 || endOccurrences.length > 1) {
    // Ambiguous or multiple regions
    const regions: TocManagedRegion[] = [];
    if (startOccurrences.length === endOccurrences.length) {
      let valid = true;
      for (let k = 0; k < startOccurrences.length; k++) {
        if (startOccurrences[k].from >= endOccurrences[k].from) {
          valid = false;
          break;
        }
        regions.push({
          from: startOccurrences[k].from,
          to: endOccurrences[k].to,
          contentFrom: startOccurrences[k].to,
          contentTo: endOccurrences[k].from,
          startLine: startOccurrences[k].line,
          endLine: endOccurrences[k].line,
        });
      }
      if (valid) {
        return { kind: 'ambiguous', regions };
      }
    }
    return {
      kind: 'malformed',
      issues: [{ message: 'Múltiplos marcadores de TOC desalinhados ou sobrepostos' }],
    };
  }

  // Detect manual TOC candidates: contiguous list of links targeting local #anchors
  const manualCandidates = detectManualTocCandidates(markdown);
  if (manualCandidates.length > 0) {
    return { kind: 'manual-candidate', candidates: manualCandidates };
  }

  return { kind: 'none' };
}

/**
 * Detects unmanaged manual TOC lists (lists with multiple local #anchor links).
 */
function detectManualTocCandidates(markdown: string): TocCandidate[] {
  const candidates: TocCandidate[] = [];
  const lines = markdown.split(/\r?\n/);
  let currentList: { from: number; to: number; startLine: number; endLine: number; items: string[] } | null = null;
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const lineLen = rawLine.length + 1;
    const match = /^\s*[-*+]\s+\[([^\]]+)\]\(#([^)]+)\)/.exec(rawLine);

    if (match) {
      if (!currentList) {
        currentList = {
          from: offset,
          to: offset + rawLine.length,
          startLine: i + 1,
          endLine: i + 1,
          items: [match[1]],
        };
      } else {
        currentList.to = offset + rawLine.length;
        currentList.endLine = i + 1;
        currentList.items.push(match[1]);
      }
    } else if (rawLine.trim() === '') {
      // allow empty line inside candidate list
    } else {
      if (currentList && currentList.items.length >= 2) {
        candidates.push({ ...currentList });
      }
      currentList = null;
    }
    offset += lineLen;
  }

  if (currentList && currentList.items.length >= 2) {
    candidates.push({ ...currentList });
  }

  return candidates;
}

/**
 * Builds the explicit Markdown list representation of the TOC with canonical markers.
 */
export function generateTocContent(headings: TocHeading[], options: TocOptions = {}): string {
  const maxDepth = options.maxDepth ?? 3;
  const filtered = headings.filter((h) => h.level <= maxDepth);
  if (filtered.length === 0) {
    return `${TOC_START_MARKER}\n${TOC_END_MARKER}`;
  }

  const minLevel = Math.min(...filtered.map((h) => h.level));
  const listItems = filtered.map((h) => {
    const indentLevel = Math.max(0, h.level - minLevel);
    const indent = '  '.repeat(indentLevel);
    return `${indent}- [${h.text}](#${h.id})`;
  });

  return `${TOC_START_MARKER}\n${listItems.join('\n')}\n${TOC_END_MARKER}`;
}

/**
 * Inserts a managed TOC into markdown at the cursor offset (or normalized block boundary).
 */
export function insertToc(
  markdown: string,
  cursorOffset: number,
  options: TocOptions = {}
): TocEditResult {
  const headings = extractTocHeadings(markdown);
  const tocContent = generateTocContent(headings, options);

  // Normalize insertion position to line boundary
  const validOffset = Math.max(0, Math.min(cursorOffset, markdown.length));
  const lineStart = markdown.lastIndexOf('\n', validOffset - 1);
  const insertPos = lineStart === -1 ? 0 : lineStart + 1;

  const prefix = insertPos > 0 && !markdown.slice(0, insertPos).endsWith('\n\n') ? '\n' : '';
  const suffix = insertPos < markdown.length && !markdown.slice(insertPos).startsWith('\n') ? '\n\n' : '\n';
  const insertText = `${prefix}${tocContent}${suffix}`;

  const newMarkdown = markdown.slice(0, insertPos) + insertText + markdown.slice(insertPos);

  return {
    newMarkdown,
    changeFrom: insertPos,
    changeTo: insertPos,
    insertText,
  };
}

/**
 * Atomically updates an existing managed TOC region.
 */
export function updateToc(markdown: string, options: TocOptions = {}): TocEditResult | null {
  const state = analyzeTocState(markdown);
  if (state.kind !== 'managed') {
    return null;
  }

  const headings = extractTocHeadings(markdown);
  const tocContent = generateTocContent(headings, options);
  const region = state.region;

  const newMarkdown = markdown.slice(0, region.from) + tocContent + markdown.slice(region.to);

  return {
    newMarkdown,
    changeFrom: region.from,
    changeTo: region.to,
    insertText: tocContent,
  };
}

/**
 * Removes an existing managed TOC region from the markdown.
 */
export function removeToc(markdown: string): { newMarkdown: string; changeFrom: number; changeTo: number } | null {
  const state = analyzeTocState(markdown);
  if (state.kind !== 'managed') {
    return null;
  }

  const region = state.region;
  let removeStart = region.from;
  let removeEnd = region.to;

  // Trim trailing newline if present to keep document clean
  if (markdown[removeEnd] === '\n') {
    removeEnd += 1;
  }

  const newMarkdown = markdown.slice(0, removeStart) + markdown.slice(removeEnd);

  return {
    newMarkdown,
    changeFrom: removeStart,
    changeTo: removeEnd,
  };
}
