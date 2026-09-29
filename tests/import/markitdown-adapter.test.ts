import { describe, it, expect, beforeEach } from 'vitest';
import {
  MarkItDownDocumentImporter,
  MARKITDOWN_ALLOWED_FORMATS,
} from '../../src/services/markitdownAdapter';
import type { ImportSourceDescriptor } from '../../src/contracts/types';

describe('MarkItDown Adapter (Spec 043)', () => {
  let adapter: MarkItDownDocumentImporter;

  beforeEach(() => {
    adapter = new MarkItDownDocumentImporter();
  });

  it('exposes correct capability metadata and allowlist of formats', () => {
    const cap = adapter.getCapability();
    expect(cap.id).toBe('markitdown');
    expect(cap.available).toBe(true);
    expect(cap.runtime).toBe('external-local');

    const expectedFormats = [
      'docx', 'html', 'htm', 'epub', 'pptx', 'xls', 'xlsx', 'csv', 'json', 'xml', 'pdf',
    ];
    for (const fmt of expectedFormats) {
      expect(MARKITDOWN_ALLOWED_FORMATS).toContain(fmt);
      expect(cap.formats.some((f) => f.formatId === fmt)).toBe(true);
    }
  });

  it('supports authorized formats and rejects unauthorized formats', () => {
    const authorized = ['docx', 'html', 'epub', 'pptx', 'xlsx', 'pdf', 'csv', 'json', 'xml'];
    for (const ext of authorized) {
      const decision = adapter.supports({
        sourceId: `/tmp/doc.${ext}`,
        displayName: `doc.${ext}`,
        extension: ext,
        sizeBytes: 1000,
      });
      expect(decision.status).toBe('supported');
    }

    const unauthorized = ['zip', 'exe', 'mp4', 'tar', 'py', 'sh'];
    for (const ext of unauthorized) {
      const decision = adapter.supports({
        sourceId: `/tmp/doc.${ext}`,
        displayName: `doc.${ext}`,
        extension: ext,
        sizeBytes: 1000,
      });
      expect(decision.status).toBe('unsupported');
    }
  });

  it('rejects remote URLs and remote URIs enforcing local-first security', async () => {
    const remoteSource: ImportSourceDescriptor = {
      sourceId: 'https://example.com/document.docx',
      displayName: 'document.docx',
      extension: 'docx',
      sizeBytes: 1000,
    };

    await expect(adapter.convert(remoteSource)).rejects.toThrow(
      'Fontes remotas ou URLs são proibidas'
    );
  });

  it('converts supported formats assigning correct fidelity classes', async () => {
    // 1. High fidelity (DOCX, HTML, EPUB)
    const docxRes = await adapter.convert({
      sourceId: '/local/sample.docx',
      displayName: 'sample.docx',
      extension: 'docx',
      sizeBytes: 5000,
    });
    expect(docxRes.fidelity.class).toBe('high');
    expect(docxRes.fidelity.label).toBe('Alta');
    expect(docxRes.markdown).toContain('# sample');

    // 2. Intermediate fidelity (PPTX, XLSX)
    const pptxRes = await adapter.convert({
      sourceId: '/local/slides.pptx',
      displayName: 'slides.pptx',
      extension: 'pptx',
      sizeBytes: 8000,
    });
    expect(pptxRes.fidelity.class).toBe('intermediate');
    expect(pptxRes.fidelity.label).toBe('Intermediária');

    // 3. Best Effort fidelity (PDF)
    const pdfRes = await adapter.convert({
      sourceId: '/local/document.pdf',
      displayName: 'document.pdf',
      extension: 'pdf',
      sizeBytes: 12000,
    });
    expect(pdfRes.fidelity.class).toBe('best-effort');
    expect(pdfRes.fidelity.label).toBe('Best effort');

    // 4. Unknown fidelity (CSV, JSON, XML)
    const csvRes = await adapter.convert({
      sourceId: '/local/table.csv',
      displayName: 'table.csv',
      extension: 'csv',
      sizeBytes: 300,
    });
    expect(csvRes.fidelity.class).toBe('unknown');
    expect(csvRes.fidelity.label).toBe('Desconhecida');
  });

  it('fails with clear error when attempting to convert unsupported format', async () => {
    await expect(
      adapter.convert({
        sourceId: '/local/file.rar',
        displayName: 'file.rar',
        extension: 'rar',
        sizeBytes: 1000,
      })
    ).rejects.toThrow('não suportado pelo MarkItDown adapter');
  });
});
