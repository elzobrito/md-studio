const PREFIX = "md-studio-draft:";
const CURRENT_PREFIX = `${PREFIX}v3:`;
export const DRAFT_RETENTION_DAYS = 90;
export const DRAFT_WARNING_DAYS = 75;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RecoverableDraft {
  key: string;
  content: string;
  savedAt: number;
  relativePath: string;
  legacy: boolean;
  browserSession: boolean;
  expired: boolean;
  expiringSoon: boolean;
}

/** Native roots can vary by opening a folder or a file; the absolute document path cannot. */
export function draftKey(workspaceRoot: string, relativePath: string): string {
  const documentPath = `${workspaceRoot.replace(/\/+$/, "")}/${relativePath.replace(/^\/+/, "")}`;
  return `${CURRENT_PREFIX}${encodeURIComponent(documentPath)}`;
}

export function saveDraft(workspaceRoot: string, relativePath: string, content: string): boolean {
  try {
    localStorage.setItem(draftKey(workspaceRoot, relativePath), JSON.stringify({ content, ts: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

function parseDraft(raw: string | null): { content: string; ts: number } | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (typeof record.content !== "string" || typeof record.ts !== "number" || !Number.isFinite(record.ts)) return null;
    return { content: record.content, ts: record.ts };
  } catch {
    return null;
  }
}

export function loadDraft(workspaceRoot: string, relativePath: string, now = Date.now()): string | null {
  try {
    const draft = parseDraft(localStorage.getItem(draftKey(workspaceRoot, relativePath)));
    if (!draft || now - draft.ts >= DRAFT_RETENTION_DAYS * DAY_MS) return null;
    return draft.content;
  } catch {
    return null;
  }
}

export function listRecoverableDrafts(now = Date.now()): RecoverableDraft[] {
  const drafts: RecoverableDraft[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const draft = parseDraft(localStorage.getItem(key));
      if (!draft) continue;
      const legacy = !key.startsWith(CURRENT_PREFIX);
      let browserSession = false;
      let relativePath = key.slice(PREFIX.length).split(":").slice(1).join(":");
      if (!legacy) {
        try {
          const documentPath = decodeURIComponent(key.slice(CURRENT_PREFIX.length));
          browserSession = documentPath.startsWith("browser:");
          relativePath = documentPath.split("/").pop() || documentPath;
        } catch { continue; }
      }
      const age = now - draft.ts;
      drafts.push({
        key,
        content: draft.content,
        savedAt: draft.ts,
        relativePath,
        legacy,
        browserSession,
        expired: age >= DRAFT_RETENTION_DAYS * DAY_MS,
        expiringSoon: age >= DRAFT_WARNING_DAYS * DAY_MS,
      });
    }
  } catch {
    return [];
  }
  return drafts.sort((a, b) => a.savedAt - b.savedAt);
}

export function removeDraftKey(key: string): boolean {
  if (!key.startsWith(PREFIX)) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(workspaceRoot: string, relativePath: string): boolean {
  return removeDraftKey(draftKey(workspaceRoot, relativePath));
}
