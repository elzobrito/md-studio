/**
 * publishingTypes.ts - Contratos e tipos centrais do Publishing Engine
 * Conforme especificação 046-publishing-engine.md
 */

export type ExportCapabilityStatus = "available" | "unavailable" | "disabled";

export type ExportCapabilityDecision =
  | { status: "available" }
  | { status: "unavailable"; reason: string }
  | { status: "disabled"; reason: string };

export interface ExporterCapability {
  id: string;
  label: string;
  extension: string;
  status: ExportCapabilityStatus;
  reason?: string;
  supportsProgress: boolean;
  supportsCancellation: boolean;
  optionsVersion: number;
}

export interface ExportSourceSnapshot {
  markdown: string;
  workspaceId?: string;
  relativePath?: string;
  displayName: string;
  contentHash: string;
  capturedAt: number;
}

export interface ExportContext {
  activeDocument?: ExportSourceSnapshot | null;
  isDirty?: boolean;
  workspaceRoot?: string | null;
}

export type ExportDestination =
  | {
      kind: "native-file";
      absolutePath: string;
      overwrite?: boolean;
    }
  | {
      kind: "browser-download";
      fileName: string;
    }
  | {
      kind: "memory";
    };

export interface ExportRequest<TOptions = Record<string, unknown>> {
  jobId: string;
  exporterId: string;
  source: ExportSourceSnapshot;
  destination: ExportDestination;
  options: TOptions;
}

export interface ExportArtifactDescriptor {
  kind: "file" | "blob" | "directory";
  path?: string;
  byteLength?: number;
  mediaType?: string;
  content?: string;
}

export interface ExportWarning {
  code: string;
  message: string;
  scope?: "document" | "asset" | "metadata" | "format";
}

// -------------------------------------------------------------
// Editorial Fallback (Spec 049) Contracts
// -------------------------------------------------------------

export type ExportNodeType =
  | "mermaid"
  | "math-inline"
  | "math-block"
  | "code-block"
  | "image"
  | "raw-html"
  | "wiki-link"
  | "github-alert"
  | "table"
  | "unknown-node";

export type FallbackKind =
  | "source-code"
  | "plain-text"
  | "alt-text"
  | "placeholder"
  | "sanitized-content";

export interface SourceLocation {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface ExportEditorialWarning {
  code: string;
  nodeType: ExportNodeType;
  message: string;
  sourceLocation?: SourceLocation;
  fallbackKind?: FallbackKind;
  fallbackValue?: string;
}

export type RenderOutcome<T> =
  | { status: "exact"; value: T }
  | { status: "adapted"; value: T; adaptation: string }
  | { status: "fallback"; value: T; warning: ExportEditorialWarning }
  | { status: "fatal"; error: string; code: string };

export interface ExportResult {
  ok: boolean;
  exporterId: string;
  artifacts: ExportArtifactDescriptor[];
  warnings: ExportWarning[];
  error?: string;
  cancelled?: boolean;
}

export type ExportJobPhase =
  | "idle"
  | "selecting"
  | "configuring"
  | "exporting"
  | "completed"
  | "cancelled"
  | "failed";
