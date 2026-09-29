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

// -------------------------------------------------------------
// Import Hub (Spec 042 & 045) Contracts
// -------------------------------------------------------------

import type { FidelityDescriptor } from "../services/importFidelity";
export type { FidelityDescriptor };

export type ImportFormatId =
  | "docx"
  | "html"
  | "epub"
  | "pptx"
  | "xlsx"
  | "pdf"
  | "csv"
  | "json"
  | "xml"
  | string;

export type SupportDecision =
  | { status: "supported"; confidence: "exact" | "likely" }
  | { status: "unsupported" }
  | { status: "unavailable"; reason: string };

export interface ImportSourceDescriptor {
  sourceId: string;
  displayName: string;
  extension?: string;
  sizeBytes: number;
  formatHint?: string;
}

export interface ImportAssetDescriptor {
  id: string;
  suggestedName: string;
  mediaType?: string;
  byteLength: number;
  role?: "image" | "media" | "attachment" | "unknown";
}

export interface ImportWarning {
  code: string;
  message: string;
  scope?: "document" | "asset" | "metadata" | "structure";
  assetId?: string;
}

export type ImportMetadataValue = string | number | boolean | null | readonly string[];
export type ImportMetadata = Readonly<Record<string, ImportMetadataValue>>;

export interface ImportResult {
  markdown: string;
  title?: string;
  assets: ImportAssetDescriptor[];
  metadata?: ImportMetadata;
  warnings: ImportWarning[];
  fidelity: FidelityDescriptor;
}

export interface ImportFormatCapability {
  formatId: string;
  extensions: readonly string[];
  mediaTypes?: readonly string[];
  available: boolean;
}

export interface ImporterCapability {
  id: string;
  available: boolean;
  formats: ImportFormatCapability[];
  runtime?: "native" | "embedded" | "wasm" | "external-local";
}

export interface ImportDestination {
  workspaceId: WorkspaceId;
  relativeMarkdownPath: string;
  assetDirectory?: string;
}

export type ImportCommitResult =
  | { ok: true; relativePath: string; fullPath?: string }
  | { ok: false; code: "DestinationExists" | "OutsideWorkspace" | "CommitFailed" | string; message: string };

export type ImportJobPhase =
  | "idle"
  | "selecting"
  | "validating"
  | "converting"
  | "ready"
  | "reviewing"
  | "committing"
  | "completed"
  | "cancelled"
  | "failed";

