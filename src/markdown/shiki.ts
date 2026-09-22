import { createHighlighter, type Highlighter } from "shiki";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";

let highlighterPromise: Promise<Highlighter> | null = null;

export const SHIKI_DEFAULT_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "c",
  "cpp",
  "csharp",
  "java",
  "php",
  "dart",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "bash",
  "sql",
] as const;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [...SHIKI_DEFAULT_LANGUAGES],
    });
  }
  return highlighterPromise;
}

export { rehypeShikiFromHighlighter };
