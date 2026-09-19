const LANG_ALLOW = new Set([
  "ts", "typescript", "js", "javascript", "json", "md", "markdown", "rust", "rs",
  "python", "py", "bash", "sh", "shell", "css", "html", "yaml", "yml", "toml", "sql", "text", "plain",
]);

export function normalizeLanguage(lang?: string | null): string {
  if (!lang) return "text";
  const l = lang.toLowerCase().trim();
  return LANG_ALLOW.has(l) ? l : "text";
}

export function parseCodeMeta(meta: string): { filename?: string; highlight: number[] } {
  const filename = /filename=([^\s]+)/.exec(meta)?.[1];
  const hl = /\{([\d,-]+)\}/.exec(meta)?.[1];
  const highlight: number[] = [];
  if (hl) {
    for (const part of hl.split(",")) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(Number);
        for (let i = a; i <= b; i++) highlight.push(i);
      } else highlight.push(Number(part));
    }
  }
  return { filename, highlight };
}
