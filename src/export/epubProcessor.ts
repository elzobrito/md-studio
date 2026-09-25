import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { getHighlighter, rehypeShikiFromHighlighter } from "../markdown/shiki";
import { parseFrontmatter } from "../markdown/frontmatter";
import { slugify } from "../services/navigation";
import type {
  EpubExportPayload,
  EpubMetadata,
  EpubProcessOptions,
  MermaidSlot,
} from "./epubTypes";

interface HastNode {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

interface MdastNode {
  type: string;
  value?: string;
  lang?: string;
  children?: MdastNode[];
  url?: string;
  alt?: string;
}

/** Pre-pass: convert GitHub-style alerts into blockquotes with textual prefixes for EPUB. */
export function transformAlertsForEpub(markdown: string): string {
  return markdown.replace(
    /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gim,
    (_m, kind: string) => {
      const label = kind.toUpperCase();
      return `> **[${label}]**`;
    },
  );
}

/** Remark plugin to convert [[wiki links]] to plain text in document body. */
function remarkWikiLinksToPlainText() {
  return (tree: MdastNode) => {
    visitMdast(tree, (node) => {
      if (node.type === "text" && typeof node.value === "string" && node.value.includes("[[")) {
        node.value = node.value.replace(
          /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
          (_m, target: string, alias?: string) => {
            return (alias || target).trim();
          },
        );
      }
    });
  };
}

/** Remark plugin to extract mermaid code blocks into slots with placeholders. */
function remarkMermaidSlots(slots: MermaidSlot[]) {
  return (tree: MdastNode) => {
    visitMdast(tree, (node, parent, index) => {
      if (node.type === "code" && node.lang === "mermaid" && parent && index !== undefined) {
        const id = `mermaid-${slots.length}`;
        const placeholder = `{{MERMAID:${id}}}`;
        slots.push({
          id,
          placeholder,
          source: (node.value || "").trim(),
          svgContent: undefined,
        });

        parent.children![index] = {
          type: "paragraph",
          children: [{ type: "text", value: placeholder }],
        };
      }
    });
  };
}

/** Remark plugin to collect local image references. */
function remarkCollectImageRefs(imageRefs: Set<string>) {
  return (tree: MdastNode) => {
    visitMdast(tree, (node) => {
      if (node.type === "image" && node.url) {
        const url = node.url.trim();
        if (isLocalImagePath(url)) {
          imageRefs.add(url);
        }
      }
    });
  };
}

function isLocalImagePath(url: string): boolean {
  if (!url) return false;
  return !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:");
}

/** Rehype plugin to assign stable heading ids for EPUB navigation. */
function rehypeHeadingIds() {
  return (tree: HastNode) => {
    const seen = new Map<string, number>();
    visitHast(tree, (node) => {
      if (node.type === "element" && node.tagName && /^h[1-6]$/.test(node.tagName)) {
        const text = extractTextFromHast(node);
        const base = slugify(text) || "section";
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        const id = n === 0 ? base : `${base}-${n}`;
        const props = (node.properties ??= {});
        if (!props.id) props.id = id;
      }
    });
  };
}

/** Sanitization schema customized for EPUB 3 + MathML + inline styled code blocks. */
const epubSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // MathML elements
    "math",
    "semantics",
    "annotation",
    "annotation-xml",
    "mrow",
    "mi",
    "mo",
    "mn",
    "ms",
    "mspace",
    "mtext",
    "mfrac",
    "msqrt",
    "mroot",
    "mstyle",
    "msub",
    "msup",
    "msubsup",
    "munder",
    "mover",
    "munderover",
    "mtable",
    "mtr",
    "mtd",
    "mpadded",
    "mphantom",
    "menclose",
    "merror",
    // Structural elements
    "section",
    "aside",
    "details",
    "summary",
    "mark",
    "figure",
    "figcaption",
  ],
  attributes: {
    ...defaultSchema.attributes,
    math: ["xmlns", "display", "alttext", "class", "className", "style"],
    semantics: ["class", "className"],
    annotation: ["encoding"],
    "annotation-xml": ["encoding"],
    mrow: ["class", "className", "style"],
    mi: ["mathvariant", "class", "className", "style"],
    mo: ["fence", "separator", "stretchy", "symmetric", "largeop", "movablelimits", "rspace", "lspace", "form", "class", "className", "style"],
    mn: ["class", "className", "style"],
    ms: ["lquote", "rquote", "class", "className", "style"],
    mtext: ["class", "className", "style"],
    mspace: ["width", "height", "depth", "linebreak", "class", "className", "style"],
    mfrac: ["linethickness", "class", "className", "style"],
    msqrt: ["class", "className", "style"],
    mroot: ["class", "className", "style"],
    mstyle: ["displaystyle", "scriptlevel", "mathvariant", "mathcolor", "mathbackground", "style"],
    msub: ["class", "className", "style"],
    msup: ["class", "className", "style"],
    msubsup: ["class", "className", "style"],
    munder: ["accentunder", "class", "className", "style"],
    mover: ["accent", "class", "className", "style"],
    munderover: ["accent", "accentunder", "class", "className", "style"],
    mtable: ["align", "rowlines", "columnlines", "frame", "framespacing", "class", "className", "style"],
    mtr: ["rowalign", "class", "className", "style"],
    mtd: ["rowalign", "columnalign", "rowspan", "columnspan", "class", "className", "style"],
    mpadded: ["width", "lspace", "height", "depth", "class", "className", "style"],
    // Code & pre inline styling
    pre: ["className", "class", "style", "tabindex", "data-language", "dataLanguage"],
    code: ["className", "class", "style", "data-language", "dataLanguage"],
    span: ["className", "class", "style", "aria-hidden"],
    p: ["className", "class", "style"],
    div: ["className", "class", "style"],
    img: [...(defaultSchema.attributes?.img ?? []), ["src"], ["alt"], ["title"], ["width"], ["height"]],
    h1: [...(defaultSchema.attributes?.h1 ?? []), ["id"], ["className"]],
    h2: [...(defaultSchema.attributes?.h2 ?? []), ["id"], ["className"]],
    h3: [...(defaultSchema.attributes?.h3 ?? []), ["id"], ["className"]],
    h4: [...(defaultSchema.attributes?.h4 ?? []), ["id"], ["className"]],
    h5: [...(defaultSchema.attributes?.h5 ?? []), ["id"], ["className"]],
    h6: [...(defaultSchema.attributes?.h6 ?? []), ["id"], ["className"]],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https", "data"],
  },
  clobberPrefix: "",
} as typeof defaultSchema;

/** Format a date into YYYY-MM-DD. */
function formatDate(d?: string | Date): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/** Extract first H1 heading from raw markdown if present. */
function extractFirstH1(markdown: string): string | undefined {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match ? match[1].trim() : undefined;
}

/**
 * Process Markdown source into an EpubExportPayload ready for EPUB 3 packaging.
 */
export async function processEpubMarkdown(
  source: string,
  options: EpubProcessOptions = {},
): Promise<EpubExportPayload> {
  const mermaidSlots: MermaidSlot[] = [];
  const imageRefsSet = new Set<string>();

  // 1. Extract YAML frontmatter
  let cleanSource = source;
  let parsedMetadata: Record<string, any> = {};
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (fmMatch) {
    const fmResult = parseFrontmatter(fmMatch[1]);
    parsedMetadata = fmResult.data || {};
    cleanSource = source.slice(fmMatch[0].length);
  }

  // 2. Build metadata with fallback hierarchy
  const rawTitle =
    parsedMetadata.title ||
    options.metadata?.title ||
    extractFirstH1(cleanSource) ||
    "Sem título";
  const title = typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : "Sem título";

  const rawAuthor = parsedMetadata.author ?? options.metadata?.author;
  const author =
    typeof rawAuthor === "string" && rawAuthor.trim() ? rawAuthor.trim() : undefined;

  const rawLang =
    parsedMetadata.lang ||
    parsedMetadata.language ||
    options.metadata?.lang ||
    "pt-BR";
  const lang = typeof rawLang === "string" && rawLang.trim() ? rawLang.trim() : "pt-BR";

  const rawDesc = parsedMetadata.description ?? options.metadata?.description;
  const description =
    typeof rawDesc === "string" && rawDesc.trim() ? rawDesc.trim() : undefined;

  const date = formatDate(parsedMetadata.date ?? options.metadata?.date);

  const metadata: EpubMetadata = {
    title,
    author,
    lang,
    description,
    date,
  };

  // 3. Pre-process alerts
  const transformedSource = transformAlertsForEpub(cleanSource);

  // 4. Setup unified pipeline
  const highlighter = await getHighlighter().catch(() => null);

  let processor: any = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkMath)
    .use(remarkWikiLinksToPlainText)
    .use(remarkMermaidSlots, mermaidSlots)
    .use(remarkCollectImageRefs, imageRefsSet)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, { output: "mathml", trust: false } as any)

  if (highlighter) {
    const theme = options.theme ?? "catppuccin-latte";
    processor = processor.use(rehypeShikiFromHighlighter, highlighter, {
      theme,
      defaultColor: false,
      fallbackLanguage: "text",
      transformers: [
        {
          pre(this: any, node: any) {
            const codeLang = this.options?.lang || "";
            node.properties = node.properties || {};
            node.properties["data-language"] = codeLang;
          },
        },
      ],
    });
  }

  processor = processor
    .use(rehypeHeadingIds)
    .use(rehypeSanitize, epubSanitizeSchema);

  const mdast = processor.parse(transformedSource);
  const hast = await processor.run(mdast);

  // Collect any remaining image tags from HAST
  visitHast(hast, (node) => {
    if (node.type === "element" && node.tagName === "img" && node.properties?.src) {
      const src = String(node.properties.src).trim();
      if (isLocalImagePath(src)) {
        imageRefsSet.add(src);
      }
    }
  });

  const bodyHtml = hastToHtml(hast);

  return {
    metadata,
    bodyHtml,
    mermaidSlots,
    imageRefs: Array.from(imageRefsSet),
  };
}

// ----------------- Helper AST visitors and serializer -----------------

function visitMdast(
  node: MdastNode,
  fn: (node: MdastNode, parent?: MdastNode, index?: number) => void,
  parent?: MdastNode,
  index?: number,
): void {
  if (!node) return;
  fn(node, parent, index);
  if (Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i++) {
      visitMdast(node.children[i], fn, node, i);
    }
  }
}

function visitHast(node: HastNode, fn: (node: HastNode) => void): void {
  if (!node || typeof node !== "object") return;
  fn(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visitHast(child, fn);
    }
  }
}

function extractTextFromHast(node: HastNode): string {
  if (!node) return "";
  if (node.type === "text") return node.value || "";
  if (Array.isArray(node.children)) {
    return node.children.map(extractTextFromHast).join("");
  }
  return "";
}

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

function hastToHtml(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as HastNode;
  if (n.type === "text") return escapeHtml(n.value ?? "");
  if (n.type === "root") return (n.children ?? []).map(hastToHtml).join("");
  if (n.type === "element") {
    const tag = n.tagName ?? "div";
    const props = n.properties ?? {};
    const attrs = Object.entries(props)
      .filter(([k, v]) => v !== undefined && v !== null && k !== "children")
      .map(([k, v]) => {
        const key = propertyName(k);
        if (v === true) return key;
        if (Array.isArray(v)) return `${key}="${escapeHtml(v.join(" "))}"`;
        return `${key}="${escapeHtml(String(v))}"`;
      })
      .join(" ");

    const inner = (n.children ?? []).map(hastToHtml).join("");
    if (VOID_ELEMENTS.has(tag.toLowerCase())) {
      return `<${tag}${attrs ? " " + attrs : ""}/>`;
    }
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
