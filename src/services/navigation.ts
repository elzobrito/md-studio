/** Prefix applied by rehype-sanitize clobberPrefix — keep in sync with sanitize.ts */
export const HEADING_ID_PREFIX = "user-content-";

export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractOutline(markdown: string): { level: number; text: string; id: string; line?: number }[] {
  const lines = markdown.split(/\n/);
  const out: { level: number; text: string; id: string; line?: number }[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      const text = m[2].replace(/#+\s*$/, "").trim();
      let base = slugify(text) || "section";
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      out.push({ level: m[1].length, text, id, line: i + 1 });
    }
  }
  return out;
}

/** DOM id after sanitize (clobberPrefix). */
export function headingDomId(slug: string): string {
  return `${HEADING_ID_PREFIX}${slug}`;
}

/** Scroll preview pane to a heading slug or line position from the outline. */
export function scrollToHeading(slug: string, root?: ParentNode | null, line?: number): boolean {
  const scope = root ?? document;
  if (line !== undefined) {
    const elByLine = (scope as Document | Element).querySelector?.(`[data-source-line="${line}"]`);
    if (elByLine) {
      elByLine.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
  }
  const el =
    (scope as Document | Element).querySelector?.(`#${CSS.escape(headingDomId(slug))}`) ??
    document.getElementById(headingDomId(slug));
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

/**
 * Resolves a target href against a base document relative path.
 * Examples:
 *   resolveRelativeLink("README.md", "docs/intro.md") -> "docs/intro.md"
 *   resolveRelativeLink("docs/intro.md", "detalhes.md") -> "docs/detalhes.md"
 *   resolveRelativeLink("docs/user-guide/MARKDOWN_GUIDE.md", "../README.md") -> "docs/README.md"
 *   resolveRelativeLink("docs/intro.md", "./sub/detalhe.md") -> "docs/sub/detalhe.md"
 *   resolveRelativeLink("docs/intro.md", "/capitulo1.md") -> "capitulo1.md"
 */
export function resolveRelativeLink(baseRelativePath: string, targetHref: string): string {
  let target = (targetHref || "").replace(/\\/g, "/").trim();
  const isRootRelative = target.startsWith("/");
  if (isRootRelative) {
    target = target.replace(/^\/+/, "");
  }

  // Base directory of the current document within the workspace
  const cleanBase = (baseRelativePath || "").replace(/\\/g, "/");
  const baseDir = isRootRelative
    ? ""
    : cleanBase.includes("/")
      ? cleanBase.slice(0, cleanBase.lastIndexOf("/"))
      : "";

  const combined = baseDir ? `${baseDir}/${target}` : target;
  const parts = combined.split("/");
  const stack: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join("/");
}

/**
 * Opens an external URL in the system browser using Tauri plugin-opener,
 * with graceful fallback to window.open for web/test environments.
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

