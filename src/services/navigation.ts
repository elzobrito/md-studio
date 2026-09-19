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

export function extractOutline(markdown: string): { level: number; text: string; id: string }[] {
  const lines = markdown.split(/\n/);
  const out: { level: number; text: string; id: string }[] = [];
  const seen = new Map<string, number>();
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      const text = m[2].replace(/#+\s*$/, "").trim();
      let base = slugify(text) || "section";
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      out.push({ level: m[1].length, text, id });
    }
  }
  return out;
}

/** DOM id after sanitize (clobberPrefix). */
export function headingDomId(slug: string): string {
  return `${HEADING_ID_PREFIX}${slug}`;
}

/** Scroll preview pane to a heading slug from the outline. */
export function scrollToHeading(slug: string, root?: ParentNode | null): boolean {
  const scope = root ?? document;
  const el =
    (scope as Document | Element).querySelector?.(`#${CSS.escape(headingDomId(slug))}`) ??
    document.getElementById(headingDomId(slug));
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}
