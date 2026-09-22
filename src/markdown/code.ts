const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rs: "rust",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  cs: "csharp",
  "c++": "cpp",
  golang: "go",
  md: "markdown",
  txt: "text",
  plain: "text",
};

const LANG_ALLOW = new Set([
  "typescript", "javascript", "json", "markdown", "rust",
  "python", "bash", "css", "html", "yaml", "toml", "sql", "text",
  "go", "c", "cpp", "csharp", "java", "php", "dart", "ruby", "xml",
  "graphql", "scss", "less", "kotlin", "swift", "lua", "diff",
]);

export function normalizeLanguage(lang?: string | null): string {
  if (!lang) return "text";
  const l = lang.toLowerCase().trim();
  const resolved = ALIASES[l] ?? l;
  return LANG_ALLOW.has(resolved) ? resolved : "text";
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
