import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

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
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className"], ["style"], ["aria-hidden"]],
    div: [...(defaultSchema.attributes?.div ?? []), ["className"], ["role", "aria-label"]],
    section: [["className"], ["role", "aria-label"]],
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
