import { createHighlighter, type Highlighter } from "shiki";
import rawRehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { shikiAdvancedCodeBlockTransformer } from "./codeBlockMetadata";

let highlighterPromise: Promise<Highlighter | null> | null = null;

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

export function getHighlighter(): Promise<Highlighter | null> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["catppuccin-latte", "catppuccin-mocha"],
      langs: [...SHIKI_DEFAULT_LANGUAGES],
    }).catch((err) => {
      console.warn("Failed to initialize Shiki highlighter:", err);
      return null;
    }) as Promise<Highlighter | null>;
  }
  return highlighterPromise;
}

const rehypeShikiFromHighlighter: any = (highlighter: any, options: any) => {
  const mergedOptions = {
    ...options,
    transformers: [
      shikiAdvancedCodeBlockTransformer(),
      ...(options?.transformers || []),
    ],
  };
  return (rawRehypeShikiFromHighlighter as any)(highlighter, mergedOptions);
};

export { rehypeShikiFromHighlighter, shikiAdvancedCodeBlockTransformer };
