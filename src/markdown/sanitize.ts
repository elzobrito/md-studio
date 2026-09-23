import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

type HastNode = {
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function visitElements(node: HastNode, visit: (element: HastNode) => void): void {
  if (node.tagName) visit(node);
  for (const child of node.children ?? []) visitElements(child, visit);
}

/** Run immediately after rehypeRaw, before any trusted renderer adds its own styles. */
export function stripMarkdownStyles() {
  return (tree: HastNode) => visitElements(tree, (node) => {
    if (node.properties) delete node.properties.style;
  });
}

/** Shiki only needs literal token colors; never allow layout or CSS functions. */
export function restrictRendererStyles() {
  return (tree: HastNode) => visitElements(tree, (node) => {
    const properties = node.properties;
    if (!properties || typeof properties.style !== "string") return;
    if (!["pre", "code", "span"].includes(node.tagName ?? "")) {
      delete properties.style;
      return;
    }
    const declarations = properties.style.split(";").map((part) => part.trim()).filter(Boolean);
    if (declarations.length === 0 || declarations.some((part) => !/^--shiki-(?:light|dark)(?:-bg)?:#[0-9a-fA-F]{3,8}$/.test(part))) {
      delete properties.style;
    }
  });
}

/** Versioned sanitize schema — security contract of the preview pipeline. */
export const mdStudioSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "section",
    "aside",
    "details",
    "summary",
    "mark",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter(
        (attribute) => !Array.isArray(attribute) || attribute[0] !== "className",
      ),
      [
        "className",
        "data-footnote-backref",
        "wiki-link",
        "is-resolved",
        "is-unresolved",
        "is-ambiguous",
      ],
      ["href"],
      ["title"],
      ["rel"],
      ["target"],
      ["dataWikiTarget"],
      ["dataWikiStatus", "resolved", "unresolved", "ambiguous"],
      ["dataWikiPath"],
    ],
    pre: ["className", "class", "style", "tabindex", "data-language", "dataLanguage"],
    code: ["className", "class", "style", "data-language", "dataLanguage"],
    span: ["className", "class", "style", "aria-hidden"],
    div: [
      "className",
      "class",
      "role",
      "aria-label",
      "data-mermaid-code",
      "dataMermaidCode",
      "data-mermaid-id",
      "dataMermaidId",
    ],
    section: ["className", "class", "role", "aria-label"],
    img: [...(defaultSchema.attributes?.img ?? []), ["src"], ["alt"], ["title"], ["loading"]],
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
  /** Keep in sync with HEADING_ID_PREFIX in services/navigation.ts */
  clobberPrefix: "user-content-",
} as typeof defaultSchema;

export function sanitizePlugin() {
  return rehypeSanitize(mdStudioSanitizeSchema);
}
