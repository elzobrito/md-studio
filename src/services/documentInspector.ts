import type { DocumentMetadata, BacklinkGroup, DoctorDiagnostic } from '../types/metadata';
import { extractAnnotations, type Annotation } from './todoExplorer';
import { extractTocHeadings, type TocHeading } from './tocManager';

export interface DocumentInspectionMetrics {
  wordCount: number;
  lineCount: number;
  headingCount: number;
  outgoingLinkCount: number;
  inboundLinkCount: number;
  assetCount: number;
  blockCount: number;
  todoCount: number;
  brokenLinkCount: number;
}

export interface OutgoingLinkItem {
  target: string;
  alias?: string | null;
  status: 'resolved' | 'unresolved' | 'ambiguous';
  line: number;
}

export interface InboundLinkItem {
  sourcePath: string;
  sourceTitle?: string | null;
  line: number;
  context?: string | null;
}

export interface BlockItem {
  id: string;
  line?: number;
}

export interface BrokenLinkItem {
  target: string;
  line: number;
  message: string;
}

export interface DocumentInspection {
  path: string;
  title: string | null;
  metrics: DocumentInspectionMetrics;
  headings: TocHeading[];
  outgoingLinks: OutgoingLinkItem[];
  inboundLinks: InboundLinkItem[];
  assets: string[];
  blocks: BlockItem[];
  todos: Annotation[];
  brokenLinks: BrokenLinkItem[];
}

export interface DocumentInspectionInput {
  path: string;
  markdown: string;
  metadata?: DocumentMetadata | null;
  backlinks?: BacklinkGroup[] | null;
  annotations?: Annotation[] | null;
  diagnostics?: DoctorDiagnostic[] | null;
}

/**
 * Builds a consolidated 360-degree DocumentInspection report combining
 * AST headings, metadata, knowledge relations, backlinks and TODOs.
 */
export function buildDocumentInspection(input: DocumentInspectionInput): DocumentInspection {
  const { path, markdown, metadata, backlinks, annotations, diagnostics } = input;

  const lines = markdown.split(/\r?\n/);
  const lineCount = lines.length;
  const wordCount = metadata?.wordCount ?? markdown.trim().split(/\s+/).filter(Boolean).length;

  // Headings
  const headings = extractTocHeadings(markdown);

  // TODOs
  const todos = annotations ?? extractAnnotations(markdown, path);

  // Outgoing Wiki Links
  const outgoingLinks: OutgoingLinkItem[] = (metadata?.wikiLinks || []).map((wl) => ({
    target: wl.target,
    alias: wl.alias,
    status: 'resolved',
    line: wl.line,
  }));

  // Inbound links / Backlinks
  const inboundLinks: InboundLinkItem[] = [];
  if (backlinks) {
    for (const group of backlinks) {
      for (const occ of group.occurrences) {
        inboundLinks.push({
          sourcePath: occ.sourcePath,
          sourceTitle: group.sourceTitle,
          line: occ.line,
          context: occ.context,
        });
      }
    }
  }

  // Assets
  const assets: string[] = Array.from(new Set(metadata?.images || []));

  // Blocks
  const blocks: BlockItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /\^([a-zA-Z0-9_-]+)\s*$/.exec(lines[i] ?? '');
    if (m) {
      blocks.push({ id: m[1], line: i + 1 });
    }
  }

  // Broken links from diagnostics or unresolved links
  const brokenLinks: BrokenLinkItem[] = [];
  if (diagnostics) {
    for (const diag of diagnostics) {
      if (diag.rule.includes('link') || diag.rule.includes('wiki') || diag.target) {
        brokenLinks.push({
          target: diag.target || 'link',
          line: diag.line,
          message: diag.message,
        });
      }
    }
  }

  const metrics: DocumentInspectionMetrics = {
    wordCount,
    lineCount,
    headingCount: headings.length,
    outgoingLinkCount: outgoingLinks.length,
    inboundLinkCount: inboundLinks.length,
    assetCount: assets.length,
    blockCount: blocks.length,
    todoCount: todos.length,
    brokenLinkCount: brokenLinks.length,
  };

  return {
    path,
    title: metadata?.title || path.split('/').pop() || null,
    metrics,
    headings,
    outgoingLinks,
    inboundLinks,
    assets,
    blocks,
    todos,
    brokenLinks,
  };
}
