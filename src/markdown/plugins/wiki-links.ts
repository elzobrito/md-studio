export type WikiResolution = {
  target: string;
  status: "resolved" | "unresolved" | "ambiguous";
  path?: string | null;
};

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const WIKI_LINK = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;

/** Transform wiki syntax in ordinary text nodes, never inside code or links. */
export function rehypeWikiLinks(options: { resolutions?: readonly WikiResolution[] } = {}) {
  const resolutions = new Map(
    (options.resolutions ?? []).map((item) => [item.target.trim().toLocaleLowerCase(), item]),
  );

  return (tree: HastNode) => transformChildren(tree, resolutions, false);
}

function transformChildren(
  node: HastNode,
  resolutions: Map<string, WikiResolution>,
  blocked: boolean,
): void {
  const isBlocked = blocked || (node.type === "element" && ["a", "code", "pre"].includes(node.tagName ?? ""));
  if (!node.children || isBlocked) return;

  const transformed: HastNode[] = [];
  for (const child of node.children) {
    if (child.type !== "text" || !child.value?.includes("[[")) {
      transformChildren(child, resolutions, isBlocked);
      transformed.push(child);
      continue;
    }

    transformed.push(...splitWikiText(child.value, resolutions));
  }
  node.children = transformed;
}

function splitWikiText(value: string, resolutions: Map<string, WikiResolution>): HastNode[] {
  const nodes: HastNode[] = [];
  let cursor = 0;
  WIKI_LINK.lastIndex = 0;
  for (const match of value.matchAll(WIKI_LINK)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: "text", value: value.slice(cursor, index) });

    const target = match[1].trim();
    const alias = match[2]?.trim();
    const resolution = resolutions.get(target.toLocaleLowerCase());
    const status = resolution?.status ?? "unresolved";
    nodes.push({
      type: "element",
      tagName: "a",
      properties: {
        className: ["wiki-link", `is-${status}`],
        href: "#",
        dataWikiTarget: target,
        dataWikiStatus: status,
        ...(resolution?.path ? { dataWikiPath: resolution.path } : {}),
      },
      children: [{ type: "text", value: alias || target }],
    });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) nodes.push({ type: "text", value: value.slice(cursor) });
  return nodes.length ? nodes : [{ type: "text", value }];
}
