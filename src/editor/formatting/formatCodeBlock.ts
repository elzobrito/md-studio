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

  const res = await formatCode(targetBlock.language, targetBlock.code);
  if (!res.formatted) {
    return false;
  }

  // Normalize line endings and trim trailing newlines to keep closing fence clean
  const cleanCode = res.code.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  const originalClean = targetBlock.code.replace(/\r\n/g, "\n").replace(/\n+$/, "");

  if (cleanCode === originalClean) {
    return false;
  }

  view.dispatch({
    changes: {
      from: targetBlock.contentStart,
      to: targetBlock.contentEnd,
      insert: cleanCode,
    },
  });

  return true;
}
