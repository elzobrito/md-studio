import type { EditorView } from "@codemirror/view";
import { formatCode } from "../../services/formatter";
import { findFencedCodeBlocks } from "../../markdown/fencedCode";

/**
 * Formats the fenced code block currently under the cursor in CodeMirror 6.
 * If the cursor is situated inside or on a fenced code block, formats it in-place.
 * Returns true if a code block was formatted, false otherwise.
 */
export async function formatCodeBlockAtCursor(view: EditorView): Promise<boolean> {
  const fullText = view.state.doc.toString();
  const blocks = findFencedCodeBlocks(fullText);
  if (blocks.length === 0) return false;

  const cursor = view.state.selection.main.head;

  // Find the block where the cursor is situated (including on the fence boundaries)
  const targetBlock = blocks.find(
    (b) => cursor >= b.startOffset && cursor <= b.endOffset
  );

  if (!targetBlock) {
    return false;
  }

  let res = await formatCode(targetBlock.language, targetBlock.code);
  if (!res.formatted && (!targetBlock.language || targetBlock.language.trim() === "")) {
    const jsRes = await formatCode("javascript", targetBlock.code);
    if (jsRes.formatted) {
      res = jsRes;
    }
  }

  if (!res.formatted) {
    view.focus();
    return false;
  }

  // Normalize line endings and trim trailing newlines to keep closing fence clean
  const cleanCode = res.code.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  const originalClean = targetBlock.code.replace(/\r\n/g, "\n").replace(/\n+$/, "");

  if (cleanCode === originalClean) {
    view.focus();
    return false;
  }

  view.dispatch({
    changes: {
      from: targetBlock.contentStart,
      to: targetBlock.contentEnd,
      insert: cleanCode,
    },
  });

  view.focus();
  return true;
}

/**
 * Formats either the fenced code block at cursor (if situated within one)
 * or the entire Markdown document using Prettier.
 * Preserves cursor position and ensures CodeMirror retains focus.
 */
export async function formatDocumentOrCodeBlock(view: EditorView): Promise<boolean> {
  const fullText = view.state.doc.toString();
  const blocks = findFencedCodeBlocks(fullText);
  const cursor = view.state.selection.main.head;

  // 1. If cursor is situated inside or on a fenced code block, try formatting that block
  const targetBlock = blocks.find(
    (b) => cursor >= b.startOffset && cursor <= b.endOffset
  );

  if (targetBlock) {
    const formattedBlock = await formatCodeBlockAtCursor(view);
    if (formattedBlock) {
      return true;
    }
  }

  // 2. Otherwise format the entire Markdown document via Prettier
  if (!fullText.trim()) {
    view.focus();
    return false;
  }

  const res = await formatCode("markdown", fullText);
  if (!res.formatted || !res.code) {
    view.focus();
    return false;
  }

  const cleanFormatted = res.code.replace(/\r\n/g, "\n");
  const cleanOriginal = fullText.replace(/\r\n/g, "\n");

  if (cleanFormatted === cleanOriginal) {
    view.focus();
    return false;
  }

  const prevLen = fullText.length;
  const newLen = cleanFormatted.length;
  const ratio = prevLen > 0 ? cursor / prevLen : 0;
  const newCursor = Math.min(newLen, Math.max(0, Math.round(ratio * newLen)));

  view.dispatch({
    changes: {
      from: 0,
      to: fullText.length,
      insert: cleanFormatted,
    },
    selection: { anchor: newCursor },
  });

  view.focus();
  return true;
}
