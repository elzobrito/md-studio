export type WikiResolution = {
  target: string;
  status: "resolved" | "unresolved" | "ambiguous" | "placeholder";
  path?: string | null;
  heading?: string | null;
  blockId?: string | null;
};

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const WIKI_LINK = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
const BLOCK_ANCHOR_REGEX = /(?:^|\s)\^([a-zA-Z0-9_\-]+)$/;

export interface WikiLinksPluginOptions {
  resolutions?: readonly WikiResolution[];
  placeholders?: readonly string[];
}

/** Transform wiki syntax in ordinary text nodes, never inside code or links. */
export function rehypeWikiLinks(options: WikiLinksPluginOptions = {}) {
  const resolutions = new Map<string, WikiResolution>();

  for (const item of options.resolutions ?? []) {
    resolutions.set(item.target.trim().toLocaleLowerCase(), item);
  }

  const placeholderSet = new Set(
    (options.placeholders ?? []).map((p) => p.trim().toLocaleLowerCase()),
  );

  return (tree: HastNode) => transformChildren(tree, resolutions, placeholderSet, false);
}

export function parseWikiTarget(target: string): {
  docTarget: string;
  heading?: string;
  blockId?: string;
} {
  const trimmed = target.trim();
  if (trimmed.includes("#^")) {
    const [doc, block] = trimmed.split("#^");
    return { docTarget: doc.trim(), blockId: block.trim() };
  }
  if (trimmed.startsWith("^")) {
    return { docTarget: "", blockId: trimmed.slice(1).trim() };
  }
  if (trimmed.includes("#")) {
    const [doc, ...rest] = trimmed.split("#");
    return { docTarget: doc.trim(), heading: rest.join("#").trim() };
  }
  return { docTarget: trimmed };
}

function transformChildren(
  node: HastNode,
  resolutions: Map<string, WikiResolution>,
  placeholders: Set<string>,
  blocked: boolean,
): void {
  const isBlocked =
    blocked || (node.type === "element" && ["a", "code", "pre"].includes(node.tagName ?? ""));
  if (!node.children || isBlocked) return;

  // Process terminal block anchors on paragraphs
  if (node.type === "element" && node.tagName === "p") {
    detectAndAttachBlockAnchor(node);
  }

  const transformed: HastNode[] = [];
  for (const child of node.children) {
    if (child.type !== "text" || !child.value?.includes("[[")) {
      transformChildren(child, resolutions, placeholders, isBlocked);
      transformed.push(child);
      continue;
    }

    transformed.push(...splitWikiText(child.value, resolutions, placeholders));
  }
  node.children = transformed;
}

function detectAndAttachBlockAnchor(pNode: HastNode): void {
  if (!pNode.children || pNode.children.length === 0) return;
  const lastChild = pNode.children[pNode.children.length - 1];
  if (lastChild.type !== "text" || !lastChild.value) return;

  const match = lastChild.value.match(BLOCK_ANCHOR_REGEX);
  if (!match) return;

  const blockId = match[1];
  // Remove anchor marker from text
  lastChild.value = lastChild.value.slice(0, match.index).trimEnd();

  pNode.properties = {
    ...pNode.properties,
    id: `block-${blockId}`,
    dataBlockId: blockId,
  };

  pNode.children.push({
    type: "element",
    tagName: "span",
    properties: {
      className: ["block-anchor"],
      dataBlockId: blockId,
      title: `Block: ^${blockId}`,
    },
    children: [{ type: "text", value: `^${blockId}` }],
  });
}

function splitWikiText(
  value: string,
  resolutions: Map<string, WikiResolution>,
  placeholders: Set<string>,
): HastNode[] {
  const nodes: HastNode[] = [];
  let cursor = 0;
  WIKI_LINK.lastIndex = 0;
  for (const match of value.matchAll(WIKI_LINK)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: "text", value: value.slice(cursor, index) });

    const rawTarget = match[1].trim();
    const alias = match[2]?.trim();
    const parsed = parseWikiTarget(rawTarget);

    const fullKey = rawTarget.toLocaleLowerCase();
    const docKey = parsed.docTarget.toLocaleLowerCase();

    const resolution = resolutions.get(fullKey) ?? resolutions.get(docKey);

    let status: "resolved" | "unresolved" | "ambiguous" | "placeholder" =
      resolution?.status ?? "unresolved";

    if (status === "unresolved" && (placeholders.has(fullKey) || placeholders.has(docKey))) {
      status = "placeholder";
    }

    const properties: Record<string, unknown> = {
      className: ["wiki-link", `is-${status}`],
      href: "#",
      dataWikiTarget: rawTarget,
      dataWikiStatus: status,
    };

    if (resolution?.path) {
      properties.dataWikiPath = resolution.path;
    }
    if (parsed.blockId) {
      properties.dataBlockId = parsed.blockId;
    }
    if (parsed.heading) {
      properties.dataHeading = parsed.heading;
    }

    nodes.push({
      type: "element",
      tagName: "a",
      properties,
      children: [{ type: "text", value: alias || rawTarget }],
    });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) nodes.push({ type: "text", value: value.slice(cursor) });
  return nodes.length ? nodes : [{ type: "text", value }];
}
