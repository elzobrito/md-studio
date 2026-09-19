const PREFIX = "md-studio-draft:";

export function draftKey(workspaceId: string, relativePath: string): string {
  return `${PREFIX}${workspaceId}:${relativePath}`;
}

export function saveDraft(workspaceId: string, relativePath: string, content: string): void {
  try {
    localStorage.setItem(draftKey(workspaceId, relativePath), JSON.stringify({ content, ts: Date.now() }));
  } catch {
    /* quota */
  }
}

export function loadDraft(workspaceId: string, relativePath: string): string | null {
  try {
    const raw = localStorage.getItem(draftKey(workspaceId, relativePath));
    if (!raw) return null;
    return (JSON.parse(raw) as { content: string }).content;
  } catch {
    return null;
  }
}

export function clearDraft(workspaceId: string, relativePath: string): void {
  localStorage.removeItem(draftKey(workspaceId, relativePath));
}
