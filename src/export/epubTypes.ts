export interface EpubMetadata {
  title: string;
  author?: string;
  lang: string;
  description?: string;
  date: string;
}

export interface MermaidSlot {
  id: string;
  placeholder: string;
  source: string;
  svgContent?: string;
}

export interface EpubExportPayload {
  metadata: EpubMetadata;
  bodyHtml: string;
  mermaidSlots: MermaidSlot[];
  imageRefs: string[];
}

export interface EpubExportResult {
  outputPath: string;
  imageCount: number;
  mermaidCount: number;
  mermaidFallbackCount: number;
  warnings: string[];
}

export interface EpubProcessOptions {
  metadata?: Partial<EpubMetadata>;
  theme?: "catppuccin-latte" | "catppuccin-mocha";
}
