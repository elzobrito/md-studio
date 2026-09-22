import * as prettier from "prettier/standalone";
import * as parserBabel from "prettier/plugins/babel";
import * as parserEstree from "prettier/plugins/estree";
import * as parserHtml from "prettier/plugins/html";
import * as parserPostcss from "prettier/plugins/postcss";
import * as parserYaml from "prettier/plugins/yaml";
import * as parserMarkdown from "prettier/plugins/markdown";
import type { FormatResponse } from "./types";

interface ParserConfig {
  parser: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: any[];
}

const WEB_PARSERS: Record<string, ParserConfig> = {
  javascript: { parser: "babel", plugins: [parserBabel, parserEstree] },
  js: { parser: "babel", plugins: [parserBabel, parserEstree] },
  jsx: { parser: "babel", plugins: [parserBabel, parserEstree] },
  typescript: { parser: "babel-ts", plugins: [parserBabel, parserEstree] },
  ts: { parser: "babel-ts", plugins: [parserBabel, parserEstree] },
  tsx: { parser: "babel-ts", plugins: [parserBabel, parserEstree] },
  json: { parser: "json", plugins: [parserBabel, parserEstree] },
  json5: { parser: "json5", plugins: [parserBabel, parserEstree] },
  html: { parser: "html", plugins: [parserHtml] },
  vue: { parser: "html", plugins: [parserHtml] },
  css: { parser: "css", plugins: [parserPostcss] },
  scss: { parser: "scss", plugins: [parserPostcss] },
  less: { parser: "less", plugins: [parserPostcss] },
  yaml: { parser: "yaml", plugins: [parserYaml] },
  yml: { parser: "yaml", plugins: [parserYaml] },
  markdown: { parser: "markdown", plugins: [parserMarkdown] },
  md: { parser: "markdown", plugins: [parserMarkdown] },
};

export function isWebLanguage(lang: string): boolean {
  return lang.toLowerCase().trim() in WEB_PARSERS;
}

export async function formatWebCode(language: string, code: string): Promise<FormatResponse> {
  const norm = language.toLowerCase().trim();
  const config = WEB_PARSERS[norm];
  if (!config) {
    return {
      formatted: false,
      code,
      formatter: "none",
    };
  }

  try {
    const formatted = await prettier.format(code, {
      parser: config.parser,
      plugins: config.plugins,
      singleQuote: false,
      semi: true,
      tabWidth: 2,
    });
    return {
      formatted: true,
      code: formatted,
      formatter: "prettier",
    };
  } catch (err) {
    return {
      formatted: false,
      code,
      formatter: "prettier",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
