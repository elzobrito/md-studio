const ALERTS = new Set(["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]);

export function transformGithubAlerts(markdown: string): string {
  // Pre-pass: convert GitHub-style alerts to blockquotes with class markers for later rendering
  return markdown.replace(
    /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gim,
    (_m, kind: string) => `> **${kind}**`,
  );
}

export function isAlertKind(s: string): boolean {
  return ALERTS.has(s.toUpperCase());
}
