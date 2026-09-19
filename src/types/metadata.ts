export interface DocumentMetadata {
  path: string;
  title: string | null;
  headings: Heading[];
  links: Link[];
  wikiLinks: WikiLink[];
  tags: string[];
  images: string[];
  tables: number;
  mermaidBlocks: number;
  katexBlocks: number;
  wordCount: number;
  lineCount: number;
  lastModified: number;
}

export interface Heading {
  depth: number;
  text: string;
  anchor: string;
}

export interface Link {
  text: string;
  url: string;
  isInternal: boolean;
  line: number;
}

export interface WikiLink {
  target: string;
  alias: string | null;
  line: number;
}

export type WikiLinkStatus = "resolved" | "unresolved" | "ambiguous";

export interface ResolvedWikiLink extends WikiLink {
  status: WikiLinkStatus;
  path: string | null;
  candidates: string[];
}

export interface WorkspaceStats {
  totalDocuments: number;
  totalWords: number;
  totalLinks: number;
  totalWikiLinks: number;
  totalTags: number;
  uniqueTags: number;
  totalMermaid: number;
  totalKatex: number;
}

export interface ReindexReport {
  indexed: number;
  skipped: number;
  errors: string[];
}
