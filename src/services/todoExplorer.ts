export interface Annotation {
  tag: string;
  path: string;
  line: number;
  column: number;
  text: string;
}

export const CANONICAL_TODO_TAGS = ['TODO', 'FIXME', 'NOTE', 'WARN', 'HACK'] as const;

export interface ExtractOptions {
  customTags?: string[];
  caseSensitive?: boolean;
}

export interface TodoFilterOptions {
  tag?: string;
  folder?: string;
  query?: string;
}

export interface GroupedAnnotations {
  key: string;
  count: number;
  items: Annotation[];
}

/**
 * Strips inline code spans (`...`) from a line to prevent false positives in inline code,
 * replacing their inner characters with spaces so column numbers remain unchanged.
 */
function maskInlineCode(line: string): string {
  let inCode = false;
  let result = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '`') {
      inCode = !inCode;
      result += '`';
    } else if (inCode) {
      result += ' ';
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Extracts annotations (TODO, FIXME, NOTE, WARN, HACK, custom) from markdown content.
 * Respects extraction policy:
 * - Excludes YAML frontmatter at start of document
 * - Excludes code fences (``` and ~~~)
 * - Excludes math blocks ($$ ... $$)
 * - Excludes inline code (`...`)
 * - Matches logical start of line (allowed prefixes: whitespace, blockquotes, lists, checkboxes, headings)
 * - Requires colon directly following the tag (e.g. TODO:)
 */
export function extractAnnotations(
  markdown: string,
  relativePath: string,
  options: ExtractOptions = {}
): Annotation[] {
  const annotations: Annotation[] = [];
  if (!markdown) return annotations;

  const tags = Array.from(
    new Set([...CANONICAL_TODO_TAGS, ...(options.customTags || []).map((t) => t.trim().toUpperCase())])
  ).filter(Boolean);

  const lines = markdown.split(/\r?\n/);
  let inFrontmatter = false;
  let inCodeFence = false;
  let fenceMarker = '';
  let inMathBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNum = lineIndex + 1;
    const rawLine = lines[lineIndex] ?? '';
    const trimmed = rawLine.trim();

    // Frontmatter check at start of file
    if (lineIndex === 0 && trimmed === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = false;
      }
      continue;
    }

    // Code fence checks (``` or ~~~)
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

    // Math block checks ($$)
    if (trimmed.startsWith('$$')) {
      if (!inMathBlock) {
        if (!trimmed.slice(2).includes('$$')) {
          inMathBlock = true;
        }
      } else {
        inMathBlock = false;
      }
      continue;
    }
    if (inMathBlock) {
      continue;
    }

    // Mask inline code to preserve column offsets while avoiding false positives
    const maskedLine = maskInlineCode(rawLine);

    // Look for logical start of line:
    // Optional prefixes:
    // - Indentation: ^\s*
    // - Headings: #{1,6}\s*
    // - Blockquotes: (>+\s*)*
    // - Lists: (?:[-*+]|\d+\.)\s*
    // - Checkboxes: (?:\[[ xX]\]\s*)?
    const prefixRegex = /^\s*(?:#{1,6}\s+)?(?:>\s*)*(?:(?:[-*+]|\d+\.)\s+)?(?:\[[ xX]\]\s+)?/;
    const prefixMatch = maskedLine.match(prefixRegex);
    const prefixOffset = prefixMatch ? prefixMatch[0].length : 0;
    const lineAfterPrefix = maskedLine.slice(prefixOffset);

    for (const tag of tags) {
      const pattern = new RegExp(`^(${tag}):(?:\\s*(.*))?$`, 'i');
      const directMatch = lineAfterPrefix.match(pattern);
      if (directMatch) {
        // Tag matched at logical start of line!
        // Check case sensitivity if required (canonical tags are uppercase)
        const matchedTag = directMatch[1] ?? '';
        if (options.caseSensitive !== false && matchedTag !== matchedTag.toUpperCase()) {
          continue;
        }

        const tagUpper = matchedTag.toUpperCase();
        // Calculate 1-based column: Unicode scalar column
        const column = prefixOffset + 1;
        // Text is everything after "TAG:" in the raw line
        const rawAfterPrefix = rawLine.slice(prefixOffset);
        const rawColonIdx = rawAfterPrefix.indexOf(':');
        const text = rawColonIdx !== -1 ? rawAfterPrefix.slice(rawColonIdx + 1).trim() : '';

        annotations.push({
          tag: tagUpper,
          path: relativePath,
          line: lineNum,
          column,
          text,
        });
        break; // Max 1 annotation per line
      }
    }
  }

  return annotations;
}

/**
 * Filter annotations by tag, folder, and textual query.
 */
export function filterAnnotations(
  annotations: Annotation[],
  options: TodoFilterOptions
): Annotation[] {
  const { tag, folder, query } = options;
  const q = query?.trim().toLowerCase();
  const tagUpper = tag?.trim().toUpperCase();

  return annotations.filter((ann) => {
    if (tagUpper && tagUpper !== 'ALL' && ann.tag !== tagUpper) {
      return false;
    }
    if (folder && !ann.path.startsWith(folder)) {
      return false;
    }
    if (q) {
      const inText = ann.text.toLowerCase().includes(q);
      const inTag = ann.tag.toLowerCase().includes(q);
      const inPath = ann.path.toLowerCase().includes(q);
      if (!inText && !inTag && !inPath) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Groups annotations by file path or by tag.
 */
export function groupAnnotations(
  annotations: Annotation[],
  groupBy: 'file' | 'tag'
): GroupedAnnotations[] {
  const groups = new Map<string, Annotation[]>();

  for (const ann of annotations) {
    const key = groupBy === 'file' ? ann.path : ann.tag;
    const list = groups.get(key) || [];
    list.push(ann);
    groups.set(key, list);
  }

  const result: GroupedAnnotations[] = [];
  for (const [key, items] of groups.entries()) {
    result.push({
      key,
      count: items.length,
      items: items.sort((a, b) => a.line - b.line),
    });
  }

  return result.sort((a, b) => {
    if (groupBy === 'tag') {
      // Keep canonical order for tags
      const idxA = CANONICAL_TODO_TAGS.indexOf(a.key as any);
      const idxB = CANONICAL_TODO_TAGS.indexOf(b.key as any);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return a.key.localeCompare(b.key);
  });
}

/**
 * Counts annotations grouped by tag.
 */
export function countByTag(annotations: Annotation[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ann of annotations) {
    counts[ann.tag] = (counts[ann.tag] || 0) + 1;
  }
  return counts;
}
