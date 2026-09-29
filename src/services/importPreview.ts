/**
 * importPreview.ts - Modelo de dados e derivações para o Import Preview
 * Conforme especificações 044-import-preview.md e 045-import-fidelity-classes.md
 *
 * Regras:
 * - O preview model é puramente derivado de ImportResult (não é fonte de verdade)
 * - Nenhuma persistência antes da confirmação explícita
 * - Cálculo determinístico de contagens estruturais (headings, tabelas, code blocks, assets)
 */

import type {
  FidelityDescriptor,
  ImportAssetDescriptor,
  ImportDestination,
  ImportResult,
  ImportSourceDescriptor,
  ImportWarning,
} from "../contracts/types";
import { sanitizeMarkdownFilename } from "./importHub";

export interface ImportPreviewCounts {
  headings: number;
  paragraphs: number;
  tables: number;
  codeBlocks: number;
  assets: number;
}

export interface ImportPreviewModel {
  jobId: string;
  source: ImportSourceDescriptor;
  markdown: string;
  title?: string;
  counts: ImportPreviewCounts;
  warnings: ImportWarning[];
  fidelity: FidelityDescriptor;
  assets: ImportAssetDescriptor[];
  destination: ImportDestination;
  isSample?: boolean;
}

/**
 * Derivação determinística de contagens estruturais sobre o Markdown bruto
 */
export function derivePreviewCounts(
  markdown: string,
  assets: ImportAssetDescriptor[] = []
): ImportPreviewCounts {
  if (!markdown) {
    return {
      headings: 0,
      paragraphs: 0,
      tables: 0,
      codeBlocks: 0,
      assets: assets.length,
    };
  }

  const lines = markdown.split(/\r?\n/);
  let headings = 0;
  let codeBlockStarts = 0;
  let inCodeBlock = false;
  let tableLines = 0;
  let inTable = false;
  let tables = 0;
  let paragraphs = 0;
  let inParagraph = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Code blocks
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        codeBlockStarts++;
        inCodeBlock = true;
      } else {
        inCodeBlock = false;
      }
      inParagraph = false;
      inTable = false;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    // Headings
    if (/^#{1,6}\s+\S/.test(line)) {
      headings++;
      inParagraph = false;
      inTable = false;
      continue;
    }

    // Tables (GFM pipe tables)
    if (line.startsWith("|") && line.endsWith("|")) {
      tableLines++;
      if (!inTable) {
        tables++;
        inTable = true;
      }
      inParagraph = false;
      continue;
    } else {
      inTable = false;
    }

    // Paragraphs
    if (line.length > 0 && !line.startsWith(">") && !line.startsWith("- ") && !line.startsWith("* ") && !/^\d+\.\s/.test(line)) {
      if (!inParagraph) {
        paragraphs++;
        inParagraph = true;
      }
    } else {
      inParagraph = false;
    }
  }

  return {
    headings,
    paragraphs,
    tables,
    codeBlocks: codeBlockStarts,
    assets: assets.length,
  };
}

/**
 * Constrói a projeção ImportPreviewModel a partir do ImportResult e metadados de job
 */
export function createPreviewModel(
  jobId: string,
  source: ImportSourceDescriptor,
  result: ImportResult,
  workspaceId: string,
  customDestinationPath?: string
): ImportPreviewModel {
  const suggestedFilename = sanitizeMarkdownFilename(result.title || source.displayName);
  const destinationPath = customDestinationPath || suggestedFilename;

  const counts = derivePreviewCounts(result.markdown, result.assets);

  return {
    jobId,
    source,
    markdown: result.markdown,
    title: result.title || source.displayName.replace(/\.[^/.]+$/, ""),
    counts,
    warnings: [...result.warnings],
    fidelity: result.fidelity,
    assets: [...result.assets],
    destination: {
      workspaceId,
      relativeMarkdownPath: destinationPath,
    },
    isSample: false,
  };
}
