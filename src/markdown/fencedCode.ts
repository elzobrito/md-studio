/**
 * Utilities for manipulating markdown fenced code blocks.
 */

export interface FencedCodeBlockInfo {
  index: number;
  language: string;
  code: string;
  startOffset: number;
  endOffset: number;
  contentStart: number;
  contentEnd: number;
}

/**
 * Replaces the content of the N-th fenced code block in a markdown string.
 * Preserves the opening fence (with language / metadata) and closing fence.
 *
 * @param markdown - Full markdown document content
 * @param targetIndex - 0-based index of the fenced code block
 * @param newCode - New code to put inside the fence
 */
export function replaceFencedCodeBlock(
  markdown: string,
  targetIndex: number,
  newCode: string
): string {
  // Matches fenced blocks starting with ``` or ~~~
  const fenceRegex = /(^|\n)(```[^\n]*\n)([\s\S]*?)(\n```(?:\n|$))|(^|\n)(~~~[^\n]*\n)([\s\S]*?)(\n~~~(?:\n|$))/g;
  let currentIndex = 0;

  return markdown.replace(fenceRegex, (match, p1, p2, p3, p4, t1, t2, t3, t4) => {
    const isBacktick = p2 !== undefined;
    const prefix = isBacktick ? (p1 ?? "") + p2 : (t1 ?? "") + t2;
    const suffix = isBacktick ? p4 : t4;

    if (currentIndex === targetIndex) {
      currentIndex++;
      // Normalize line endings and trim trailing newlines to keep closing fence clean
      const cleanCode = newCode.replace(/\r\n/g, "\n").replace(/\n+$/, "");
      return `${prefix}${cleanCode}${suffix}`;
    }

    currentIndex++;
    return match;
  });
}

/**
 * Finds all fenced code blocks in the markdown document with their 0-based index,
 * language, and raw code content.
 */
export function findFencedCodeBlocks(markdown: string): FencedCodeBlockInfo[] {
  const fenceRegex = /(^|\n)(```([^\n]*)\n)([\s\S]*?)(\n```(?:\n|$))|(^|\n)(~~~([^\n]*)\n)([\s\S]*?)(\n~~~(?:\n|$))/g;
  const blocks: FencedCodeBlockInfo[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    const isBacktick = match[2] !== undefined;
    const prefix = isBacktick ? (match[1] ?? "") + match[2] : (match[6] ?? "") + match[7];
    const langInfo = (isBacktick ? match[3] : match[8]) ?? "";
    const rawCode = (isBacktick ? match[4] : match[9]) ?? "";
    const language = langInfo.trim().split(/\s+/)[0] || "";
    const contentStart = match.index + prefix.length;
    const contentEnd = contentStart + rawCode.length;

    blocks.push({
      index: index++,
      language,
      code: rawCode,
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      contentStart,
      contentEnd,
    });
  }

  return blocks;
}
