export interface SourceBlockPosition {
  line?: number;
  column?: number;
  offset?: number;
}

/**
 * Registra as posições de código (<pre><code>) antes que o Shiki substitua
 * os nós originais por nós estilizados sem `position`.
 */
export function recordPreCodePositions(tree: any): SourceBlockPosition[] {
  const positions: SourceBlockPosition[] = [];
  if (!tree || typeof tree !== "object") return positions;

  function visit(node: any) {
    if (!node || typeof node !== "object") return;
    if (node.type === "element" && node.tagName === "pre") {
      const pos = node.position?.start;
      if (pos && typeof pos.line === "number" && pos.line > 0) {
        positions.push({ line: pos.line, offset: pos.offset, column: pos.column });
      } else {
        const codeChild = (node.children || []).find((c: any) => c.type === "element" && c.tagName === "code");
        const cpos = codeChild?.position?.start;
        if (cpos && typeof cpos.line === "number" && cpos.line > 0) {
          positions.push({ line: cpos.line, offset: cpos.offset, column: cpos.column });
        } else {
          positions.push({});
        }
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child);
      }
    }
  }

  visit(tree);
  return positions;
}

/**
 * Percorre o HAST do preview e propaga as posições do AST (linhas e offsets)
 * diretamente como atributos data-source-line e data-source-offset nos elementos de bloco:
 * headings (h1-h6), parágrafos (p), listas (ul, ol, li), code blocks (pre), blockquotes e tabelas.
 * Reutiliza estritamente as posições já calculadas pelo parser remark/Unified, sem segundo parse.
 */
export function attachSourcePositionsToHast(tree: any, prePositions?: SourceBlockPosition[]): void {
  if (!tree || typeof tree !== "object") return;

  const blockTags = new Set([
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "ul", "ol", "li", "pre",
    "blockquote", "table"
  ]);

  let preIndex = 0;

  function visit(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.type === "element" && blockTags.has(node.tagName)) {
      let line: number | undefined;
      let offset: number | undefined;

      if (node.tagName === "pre" && prePositions && preIndex < prePositions.length) {
        const recorded = prePositions[preIndex++];
        line = recorded.line;
        offset = recorded.offset;
      }

      if (line === undefined) {
        const pos = node.position?.start;
        if (pos && typeof pos.line === "number" && pos.line > 0) {
          line = pos.line;
          offset = pos.offset;
        }
      }

      if (line !== undefined && line > 0) {
        node.properties = node.properties || {};
        node.properties["data-source-line"] = String(line);
        if (typeof offset === "number") {
          node.properties["data-source-offset"] = String(offset);
        }
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child);
      }
    }
  }

  visit(tree);
}

/**
 * Encontra a posição no Markdown a partir de um elemento DOM clicado no preview.
 * Retorna null se o elemento não possuir posição confiável no AST.
 */
export function findSourcePositionFromElement(
  target: Element,
  containerRoot: Element
): SourceBlockPosition | null {
  if (!containerRoot.contains(target)) return null;

  // Buscar o bloco mais próximo com anotação de posição do AST
  const block = target.closest<HTMLElement>(
    "[data-source-line], [data-source-offset]"
  );

  if (!block || !containerRoot.contains(block)) {
    return null;
  }

  const lineAttr = block.getAttribute("data-source-line");
  const offsetAttr = block.getAttribute("data-source-offset");

  if (!lineAttr && !offsetAttr) {
    return null;
  }

  const line = lineAttr ? parseInt(lineAttr, 10) : undefined;
  const offset = offsetAttr ? parseInt(offsetAttr, 10) : undefined;

  if (line !== undefined && (isNaN(line) || line < 1)) {
    return null;
  }
  if (offset !== undefined && (isNaN(offset) || offset < 0)) {
    return null;
  }

  return { line, offset };
}
