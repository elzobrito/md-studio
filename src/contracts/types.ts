/** Public IPC / domain types for MD Studio v1 */
export type WorkspaceId = string;

export interface WorkspaceDescriptor {
  id: WorkspaceId;
  rootLabel: string;
  kind: "folder" | "single-file";
}

export interface FileEntry {
  name: string;
  relativePath: string;
  kind: "file" | "dir";
  size?: number;
}

export interface DocumentSnapshot {
  workspaceId: WorkspaceId;
  relativePath: string;
  content: string;
  encoding: "utf-8";
  mtimeMs: number;
  contentHash: string;
  version: number;
}

export type SaveReason =
  | "before-manual-save"
  | "before-autosave-checkpoint"
  | "pre-restore"
  | "before-save-as-overwrite";

export interface HistoryEntry {
  path: string;
  timestamp: number;
  hash: string;
  size: number;
  reason: string;
}

export interface HistorySnapshot {
  entry: HistoryEntry;
  content: string;
}

export interface SaveDocumentRequest {
  workspaceId: WorkspaceId;
  relativePath: string;
  expectedHash: string;
  content: string;
  reason?: SaveReason | string;
}

export type SaveResult =
  | { ok: true; snapshot: DocumentSnapshot }
  | { ok: false; code: "HashMismatch" | "OutsideWorkspace" | "IoError"; message: string };

export interface SearchResult {
  relativePath: string;
  line: number;
  preview: string;
}

export type WatchEvent =
  | { type: "created" | "modified" | "removed" | "renamed"; relativePath: string; from?: string };

export type IpcErrorCode =
  | "OutsideWorkspace"
  | "SymlinkEscape"
  | "HashMismatch"
  | "NotFound"
  | "PermissionDenied"
  | "InvalidPath"
  | "IoError";

export type GitStatusCode = "M" | "A" | "D" | "R";

export interface GitFileStatus {
  path: string;
  status: GitStatusCode;
  isStaged: boolean;
}

export interface FileDiffGutter {
  addedLines: number[];
  modifiedLines: number[];
  deletedLines: number[];
}

export interface GitCommitSummary {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  summary: string;
}

