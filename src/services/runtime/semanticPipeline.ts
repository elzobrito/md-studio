import { extractTocHeadings } from '../tocManager';
import { extractAnnotations } from '../todoExplorer';
import { parseFrontmatter } from '../../markdown/frontmatter';
import { processMarkdown, type ProcessResult } from '../../markdown/processor';
import type { DocumentMetadata, BacklinkGroup } from '../../types/metadata';
import type { OutgoingLinkItem, BlockItem, DocumentInspectionMetrics } from '../documentInspector';
import type { DocumentSemanticModel, SemanticArtifact, PreviewArtifact } from './semanticModel';
import { BoundedArtifactCache, type CacheMetrics } from './artifactCache';

export interface SemanticPipelineOptions {
  maxSemanticEntries?: number;
  maxSemanticBytes?: number;
  maxPreviewEntries?: number;
  maxPreviewBytes?: number;
}

/**
 * Pipeline for extracting semantic models and preview artifacts, completely decoupled
 * from the Preview DOM. Incorporates bounded LRU caches and stale-result rejection.
 */
export class SemanticPipeline {
  private readonly semanticCache: BoundedArtifactCache<SemanticArtifact>;
  private readonly previewCache: BoundedArtifactCache<PreviewArtifact>;

  constructor(options: SemanticPipelineOptions = {}) {
    this.semanticCache = new BoundedArtifactCache<SemanticArtifact>({
      maxEntries: options.maxSemanticEntries ?? 30,
      maxEstimatedBytes: options.maxSemanticBytes ?? 10 * 1024 * 1024, // 10 MB
    });
    this.previewCache = new BoundedArtifactCache<PreviewArtifact>({
      maxEntries: options.maxPreviewEntries ?? 15,
      maxEstimatedBytes: options.maxPreviewBytes ?? 25 * 1024 * 1024, // 25 MB
    });
  }

  public setActiveDocumentId(documentId: string | null): void {
    this.semanticCache.setActiveDocumentId(documentId);
    this.previewCache.setActiveDocumentId(documentId);
  }

  public evictDocument(documentId: string): void {
    this.semanticCache.evictDocument(documentId);
    this.previewCache.evictDocument(documentId);
  }

  public clear(): void {
    this.semanticCache.clear();
    this.previewCache.clear();
  }

  public getSemanticMetrics(): CacheMetrics {
    return this.semanticCache.getMetrics();
  }

  public getPreviewMetrics(): CacheMetrics {
    return this.previewCache.getMetrics();
  }

  /**
   * Helper to evaluate if an asynchronous operation's completion is stale
   * compared to the current live document state.
   */
  public isStale(
    taskGen: number,
    taskIdentity: string,
    currentGen: number,
    currentIdentity: string
  ): boolean {
    return taskGen !== currentGen || taskIdentity !== currentIdentity;
  }

  /**
   * Pure synchronous computation of DocumentSemanticModel directly from markdown source
   * and metadata. Zero DOM involvement.
   */
  public computeSemanticModel(
    documentId: string,
    operationGeneration: number,
    contentIdentity: string,
    markdown: string,
    path = '',
    metadata?: DocumentMetadata | null,
    backlinks?: BacklinkGroup[] | null
  ): DocumentSemanticModel {
    const lines = markdown.split(/\r?\n/);
    const lineCount = lines.length;
    const words = markdown.trim().split(/\s+/).filter(Boolean);
    const wordCount = metadata?.wordCount ?? words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // Headings from TOC manager (pure AST/regex)
    const headings = extractTocHeadings(markdown);

    // TODOs / annotations (pure regex)
    const todos = extractAnnotations(markdown, path);

    // Frontmatter
    let frontmatter: Record<string, unknown> | null = null;
    const fmMatch = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
    if (fmMatch) {
      const parsed = parseFrontmatter(fmMatch[1]);
      if (parsed.data) {
        frontmatter = parsed.data as Record<string, unknown>;
      }
    }

    // Outgoing links
    const outgoingLinks: OutgoingLinkItem[] = (metadata?.wikiLinks || []).map((wl) => ({
      target: wl.target,
      alias: wl.alias,
      status: 'resolved',
      line: wl.line,
    }));

    // Inbound links
    let inboundLinkCount = 0;
    if (backlinks) {
      for (const g of backlinks) {
        inboundLinkCount += g.occurrences.length;
      }
    }

    // Blocks
    const blocks: BlockItem[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = /\^([a-zA-Z0-9_-]+)\s*$/.exec(lines[i] ?? '');
      if (m) {
        blocks.push({ id: m[1], line: i + 1 });
      }
    }

    const hasDiagrams = /```(mermaid|dot|graphviz|wavedrom)/i.test(markdown);
    const hasCodeBlocks = /```[a-zA-Z0-9_-]*/.test(markdown);

    const metrics: DocumentInspectionMetrics = {
      wordCount,
      lineCount,
      headingCount: headings.length,
      outgoingLinkCount: outgoingLinks.length,
      inboundLinkCount,
      assetCount: metadata?.images?.length ?? 0,
      blockCount: blocks.length,
      todoCount: todos.length,
      brokenLinkCount: 0,
    };

    return {
      documentId,
      operationGeneration,
      contentIdentity,
      headings,
      outgoingLinks,
      blocks,
      todos,
      metrics,
      frontmatter,
      readingTimeMinutes,
      hasDiagrams,
      hasCodeBlocks,
      createdAt: Date.now(),
    };
  }

  /**
   * Retrieves or computes a DocumentSemanticModel with LRU caching.
   */
  public getOrComputeSemanticModel(
    documentId: string,
    operationGeneration: number,
    contentIdentity: string,
    markdown: string,
    path = '',
    metadata?: DocumentMetadata | null,
    backlinks?: BacklinkGroup[] | null
  ): DocumentSemanticModel {
    const cached = this.semanticCache.get(documentId, contentIdentity, operationGeneration);
    if (cached) {
      return cached.model;
    }

    const model = this.computeSemanticModel(
      documentId,
      operationGeneration,
      contentIdentity,
      markdown,
      path,
      metadata,
      backlinks
    );

    // Estimate memory weight: model JSON length * 2
    const estimatedWeightBytes = JSON.stringify(model).length * 2 + 1024;

    this.semanticCache.put({
      documentId,
      operationGeneration,
      contentIdentity,
      model,
      estimatedWeightBytes,
      createdAt: Date.now(),
    });

    return model;
  }

  /**
   * Retrieves or asynchronously renders a PreviewArtifact with LRU caching
   * and stale-result guard.
   */
  public async getOrComputePreview(
    documentId: string,
    operationGeneration: number,
    contentIdentity: string,
    markdown: string,
    getCurrentState?: () => { operationGeneration: number; contentIdentity: string }
  ): Promise<PreviewArtifact | null> {
    const cached = this.previewCache.get(documentId, contentIdentity, operationGeneration);
    if (cached) {
      return cached;
    }

    const processResult: ProcessResult = await processMarkdown(markdown);

    // Stale guard: check if current state moved on during async markdown processing
    if (getCurrentState) {
      const current = getCurrentState();
      if (this.isStale(operationGeneration, contentIdentity, current.operationGeneration, current.contentIdentity)) {
        // Discard stale result without polluting cache
        return null;
      }
    }

    const estimatedWeightBytes = (processResult.html.length * 2) + 2048;

    const artifact: PreviewArtifact = {
      documentId,
      operationGeneration,
      contentIdentity,
      html: processResult.html,
      title: processResult.title,
      diagnostics: processResult.diagnostics,
      estimatedWeightBytes,
      createdAt: Date.now(),
    };

    this.previewCache.put(artifact);
    return artifact;
  }
}
