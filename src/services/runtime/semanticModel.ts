import type { TocHeading } from '../tocManager';
import type { Annotation } from '../todoExplorer';
import type { DocumentInspectionMetrics, OutgoingLinkItem, BlockItem } from '../documentInspector';

/**
 * Canonical semantic representation of a markdown document.
 * Strictly decoupled from any DOM or rendering surface (Preview / HTML / Diff).
 */
export interface DocumentSemanticModel {
  documentId: string;
  operationGeneration: number;
  contentIdentity: string;
  headings: TocHeading[];
  outgoingLinks: OutgoingLinkItem[];
  blocks: BlockItem[];
  todos: Annotation[];
  metrics: DocumentInspectionMetrics;
  frontmatter: Record<string, unknown> | null;
  readingTimeMinutes: number;
  hasDiagrams: boolean;
  hasCodeBlocks: boolean;
  createdAt: number;
}

/**
 * Asynchronous semantic artifact carrying document identity, revision generation,
 * and content identity for stale-result validation.
 */
export interface SemanticArtifact {
  documentId: string;
  operationGeneration: number;
  contentIdentity: string;
  model: DocumentSemanticModel;
  estimatedWeightBytes: number;
  createdAt: number;
}

/**
 * Asynchronous preview artifact containing rendered HTML and source mapping metadata,
 * carrying generation and content identity to guarantee stale-rejection.
 */
export interface PreviewArtifact {
  documentId: string;
  operationGeneration: number;
  contentIdentity: string;
  html: string;
  title?: string;
  diagnostics: string[];
  estimatedWeightBytes: number;
  createdAt: number;
}
