export interface Bookmark {
  id: string;
  path: string;
  line: number;
  label?: string;
  contextHash?: string;
  snippet?: string;
}

export type BookmarkStatus = 'resolved' | 'stale' | 'missing-file' | 'ambiguous';

export interface ResolvedBookmark extends Bookmark {
  status: BookmarkStatus;
  resolvedLine?: number;
}

export interface WorkspaceBookmarkFile {
  version: 1;
  bookmarks: Bookmark[];
}

/**
 * Generates a simple pseudo-UUID v4 for client-side bookmark identities.
 */
export function generateBookmarkId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Computes a deterministic hash representation for a string.
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Computes context hash over a 3-line window (prev, curr, next) to anchor bookmarks reliably.
 */
export function computeContextHash(lines: string[], lineIndex: number): string {
  const prev = lineIndex > 0 ? (lines[lineIndex - 1] ?? '').trim() : '^start^';
  const curr = (lines[lineIndex] ?? '').trim();
  const next = lineIndex + 1 < lines.length ? (lines[lineIndex + 1] ?? '').trim() : '$end$';
  return simpleHash(`${prev}||${curr}||${next}`);
}

/**
 * Extracts a display snippet from a line of text.
 */
export function extractSnippet(lineText: string, maxLength: number = 80): string {
  const trimmed = lineText.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

/**
 * Reanchors a list of bookmarks against actual document content.
 * Follows the spec:
 * 1. Test stored line with context hash.
 * 2. If mismatch, search within document lines for unique context match.
 * 3. If exactly 1 match found, reanchor and mark 'resolved'.
 * 4. If multiple matches found, mark 'ambiguous'.
 * 5. If no match found, mark 'stale' (never silently guess a random position).
 */
export function reanchorBookmarks(bookmarks: Bookmark[], content: string): ResolvedBookmark[] {
  const lines = content.split(/\r?\n/);
  const results: ResolvedBookmark[] = [];

  for (const bm of bookmarks) {
    const storedIdx = bm.line - 1;

    // Check if stored line is within range and matches context
    if (storedIdx >= 0 && storedIdx < lines.length) {
      const currentContext = computeContextHash(lines, storedIdx);
      if (bm.contextHash == null || currentContext === bm.contextHash) {
        results.push({
          ...bm,
          status: 'resolved',
          resolvedLine: bm.line,
        });
        continue;
      }
    }

    // Search across document for context match
    if (bm.contextHash) {
      const candidateLines: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (computeContextHash(lines, i) === bm.contextHash) {
          candidateLines.push(i + 1);
        }
      }

      if (candidateLines.length === 1) {
        results.push({
          ...bm,
          status: 'resolved',
          resolvedLine: candidateLines[0],
        });
        continue;
      }

      if (candidateLines.length > 1) {
        results.push({
          ...bm,
          status: 'ambiguous',
          resolvedLine: bm.line,
        });
        continue;
      }
    }

    // Unrecoverable -> Mark stale explicitly
    results.push({
      ...bm,
      status: 'stale',
      resolvedLine: bm.line,
    });
  }

  return results;
}

export class BookmarkStore {
  private memoryStore: Map<string, Bookmark[]> = new Map();

  private getStorageKey(workspaceId: string): string {
    return `md-studio:bookmarks:${workspaceId || 'default'}`;
  }

  public getBookmarks(workspaceId: string = 'default'): Bookmark[] {
    const key = this.getStorageKey(workspaceId);
    if (!this.memoryStore.has(key)) {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as WorkspaceBookmarkFile;
            if (parsed && parsed.version === 1 && Array.isArray(parsed.bookmarks)) {
              this.memoryStore.set(key, parsed.bookmarks);
            }
          }
        }
      } catch {
        // Fallback to empty in-memory store
      }
      if (!this.memoryStore.has(key)) {
        this.memoryStore.set(key, []);
      }
    }
    return this.memoryStore.get(key) || [];
  }

  public saveBookmarks(workspaceId: string = 'default', bookmarks: Bookmark[]): void {
    const key = this.getStorageKey(workspaceId);
    this.memoryStore.set(key, bookmarks);
    try {
      if (typeof localStorage !== 'undefined') {
        const payload: WorkspaceBookmarkFile = {
          version: 1,
          bookmarks,
        };
        localStorage.setItem(key, JSON.stringify(payload));
      }
    } catch {
      // storage unavailable
    }
  }

  public getBookmarksForPath(workspaceId: string = 'default', path: string): Bookmark[] {
    const all = this.getBookmarks(workspaceId);
    return all.filter((b) => b.path === path).sort((a, b) => a.line - b.line);
  }

  public toggleBookmark(
    workspaceId: string = 'default',
    path: string,
    line: number,
    content: string,
    label?: string
  ): { action: 'added' | 'removed'; bookmark?: Bookmark } {
    const all = this.getBookmarks(workspaceId);
    const existingIndex = all.findIndex((b) => b.path === path && b.line === line);

    if (existingIndex !== -1) {
      all.splice(existingIndex, 1);
      this.saveBookmarks(workspaceId, all);
      return { action: 'removed' };
    }

    const lines = content.split(/\r?\n/);
    const lineIdx = line - 1;
    const lineText = lines[lineIdx] ?? '';
    const contextHash = computeContextHash(lines, lineIdx);
    const snippet = extractSnippet(lineText);

    const newBookmark: Bookmark = {
      id: generateBookmarkId(),
      path,
      line,
      label: label?.trim() || undefined,
      contextHash,
      snippet,
    };

    all.push(newBookmark);
    this.saveBookmarks(workspaceId, all);
    return { action: 'added', bookmark: newBookmark };
  }

  public removeBookmark(workspaceId: string = 'default', id: string): boolean {
    const all = this.getBookmarks(workspaceId);
    const idx = all.findIndex((b) => b.id === id);
    if (idx !== -1) {
      all.splice(idx, 1);
      this.saveBookmarks(workspaceId, all);
      return true;
    }
    return false;
  }

  public renameBookmark(workspaceId: string = 'default', id: string, label: string): boolean {
    const all = this.getBookmarks(workspaceId);
    const bm = all.find((b) => b.id === id);
    if (bm) {
      bm.label = label.trim() || undefined;
      this.saveBookmarks(workspaceId, all);
      return true;
    }
    return false;
  }

  public getNextBookmark(bookmarks: Bookmark[], currentLine: number): Bookmark | undefined {
    const sorted = [...bookmarks].sort((a, b) => a.line - b.line);
    const next = sorted.find((b) => b.line > currentLine);
    return next || sorted[0]; // Wrap around
  }

  public getPrevBookmark(bookmarks: Bookmark[], currentLine: number): Bookmark | undefined {
    const sorted = [...bookmarks].sort((a, b) => a.line - b.line);
    const prevs = sorted.filter((b) => b.line < currentLine);
    if (prevs.length > 0) {
      return prevs[prevs.length - 1];
    }
    return sorted[sorted.length - 1]; // Wrap around
  }
}

export const bookmarkStore = new BookmarkStore();
