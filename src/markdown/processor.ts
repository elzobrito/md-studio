import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { flagsFor, type MarkdownProfile } from "./profile";
import { sanitizePlugin } from "./sanitize";
import { transformGithubAlerts } from "./plugins/alerts";
import { rehypeWikiLinks, type WikiResolution } from "./plugins/wiki-links";
import { parseFrontmatter } from "./frontmatter";
import { normalizeLanguage } from "./code";
import { slugify } from "../services/navigation";

export interface ProcessOptions {
  profile?: MarkdownProfile;
  allowRemote?: boolean;
  wikiLinks?: readonly WikiResolution[];
}

export interface ProcessResult {
  html: string;
  title?: string;
  diagnostics: string[];
  hast: unknown;
}

export async function processMarkdown(source: string, options: ProcessOptions = {}): Promise<ProcessResult> {
  const profile = options.profile ?? "github-extensions";
  const flags = flagsFor(profile);
  const diagnostics: string[] = [];
  let md = flags.alerts ? transformGithubAlerts(source) : source;

  // extract yaml front matter manually for zod validation
  let title: string | undefined;
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(md);
  if (fm && flags.frontmatter) {
    const parsed = parseFrontmatter(fm[1]);
    diagnostics.push(...parsed.errors.map((e) => `frontmatter: ${e}`));
    title = parsed.data.title;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let processor: any = unified().use(remarkParse);
  if (flags.gfm) processor = processor.use(remarkGfm);
  if (flags.frontmatter) processor = processor.use(remarkFrontmatter, ["yaml"]);
  if (flags.math) processor = processor.use(remarkMath);
  if (flags.directives) processor = processor.use(remarkDirective);

  processor = processor
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeWikiLinks, { resolutions: options.wikiLinks })
    .use(rehypeHeadingIds)
    .use(rehypeHighlight, { detect: false, plainText: ["text", "plain", "txt"] })
    .use(rehypeKatex, { throwOnError: false, trust: false })
    .use(sanitizePlugin);

  const tree = await processor.run(processor.parse(md));
  // Produce HTML string via simple serialization of text for export path
  const html = hastToHtml(tree);
  return { html, title, diagnostics, hast: tree };
}

/** Assign stable ids to h1–h6 (same algorithm as extractOutline). */
function rehypeHeadingIds() {
  return (tree: unknown) => {
    const seen = new Map<string, number>();
    visitHeadings(tree, (node) => {
      const text = headingText(node);
      let base = slugify(text) || "section";
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      const props = (node.properties ??= {}) as Record<string, unknown>;
      if (!props.id) props.id = id;
    });
  };
}

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function visitHeadings(node: unknown, fn: (n: HastNode) => void): void {
  if (!node || typeof node !== "object") return;
  const n = node as HastNode;
  if (n.type === "element" && n.tagName && /^h[1-6]$/.test(n.tagName)) {
    fn(n);
  }
  for (const c of n.children ?? []) visitHeadings(c, fn);
}

function headingText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(headingText).join("").trim();
}

function hastToHtml(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: unknown[] };
  if (n.type === "text") return escape(n.value ?? "");
  if (n.type === "root") return (n.children ?? []).map(hastToHtml).join("");
  if (n.type === "element") {
    const tag = n.tagName ?? "div";
    const props = n.properties ?? {};
    const attrs = Object.entries(props)
      .filter(([k, v]) => v !== undefined && v !== null && k !== "children")
      .map(([k, v]) => {
        const key = propertyName(k);
        if (v === true) return key;
        if (Array.isArray(v)) return `${key}="${escape(v.join(" "))}"`;
        return `${key}="${escape(String(v))}"`;
      })
      .join(" ");
    const inner = (n.children ?? []).map(hastToHtml).join("");
    if (["img", "br", "hr"].includes(tag)) return `<${tag}${attrs ? " " + attrs : ""}/>`;
    return `<${tag}${attrs ? " " + attrs : ""}>${inner}</${tag}>`;
  }
  return "";
}

function propertyName(key: string): string {
  if (key === "className") return "class";
  if (key.startsWith("data") && /[A-Z]/.test(key)) {
    return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
  return key;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export { normalizeLanguage };
