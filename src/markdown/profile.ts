export type MarkdownProfile = "commonmark" | "github-extensions";

export interface ProfileFlags {
  gfm: boolean;
  frontmatter: boolean;
  math: boolean;
  directives: boolean;
  alerts: boolean;
  mermaid: boolean;
}

export function flagsFor(profile: MarkdownProfile): ProfileFlags {
  if (profile === "commonmark") {
    return { gfm: false, frontmatter: false, math: false, directives: false, alerts: false, mermaid: false };
  }
  return { gfm: true, frontmatter: true, math: true, directives: true, alerts: true, mermaid: true };
}
