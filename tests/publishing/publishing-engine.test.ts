import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExporterRegistry,
  HtmlDocumentExporter,
  LegacyPrintPdfExporter,
  EpubDocumentExporter,
  PublishingEngineService,
} from '../../src/services/publishingEngine';
import type { ExportContext, ExportSourceSnapshot } from '../../src/contracts/publishingTypes';

describe('Publishing Engine (Spec 046)', () => {
  let registry: ExporterRegistry;

  const sampleSource: ExportSourceSnapshot = {
    markdown: '# Documento de Teste\n\nTexto para exportação.',
    displayName: 'teste.md',
    contentHash: 'hash-abc',
    capturedAt: Date.now(),
  };

  beforeEach(() => {
    registry = new ExporterRegistry();
  });

  describe('ExporterRegistry', () => {
    it('registers exporters and finds them by id', () => {
      const htmlExp = new HtmlDocumentExporter();
      registry.register(htmlExp);

      expect(registry.getExporters()).toHaveLength(1);
      expect(registry.findExporter('html')).toBe(htmlExp);
      expect(registry.findExporter('unknown')).toBeNull();
    });

    it('reports capability status based on context', () => {
      registry.register(new HtmlDocumentExporter());

      const emptyContext: ExportContext = { activeDocument: null };
      const capsDisabled = registry.getCapabilities(emptyContext);
      expect(capsDisabled[0].status).toBe('disabled');
      expect(capsDisabled[0].reason).toContain('Nenhum documento');

      const activeContext: ExportContext = { activeDocument: sampleSource };
      const capsAvailable = registry.getCapabilities(activeContext);
      expect(capsAvailable[0].status).toBe('available');
    });
  });

  describe('HtmlDocumentExporter', () => {
    it('exports markdown to HTML memory artifact without DOM dependency', async () => {
      const exporter = new HtmlDocumentExporter();
      const res = await exporter.export(
        {
          jobId: 'job-1',
          exporterId: 'html',
          source: sampleSource,
          destination: { kind: 'memory' },
          options: { title: 'Título Personalizado' },
        },
        { activeDocument: sampleSource }
      );

      expect(res.ok).toBe(true);
      expect(res.exporterId).toBe('html');
      expect(res.artifacts).toHaveLength(1);
      expect(res.artifacts[0].content).toContain('<!DOCTYPE html>');
      expect(res.artifacts[0].content).toContain('Documento de Teste');
      expect(res.artifacts[0].content).toContain('Título Personalizado');
    });
  });

  describe('LegacyPrintPdfExporter', () => {
    it('exports via print and attaches legacy warning without claiming 050 gate', async () => {
      const exporter = new LegacyPrintPdfExporter();
      const printSpy = vi.fn();
      vi.stubGlobal('window', { print: printSpy });

      const res = await exporter.export(
        {
          jobId: 'job-print',
          exporterId: 'pdf-legacy',
          source: sampleSource,
          destination: { kind: 'memory' },
          options: {},
        },
        { activeDocument: sampleSource }
      );

      expect(res.ok).toBe(true);
      expect(printSpy).toHaveBeenCalled();
      expect(res.warnings).toHaveLength(1);
      expect(res.warnings[0].code).toBe('LEGACY_PRINT_PDF');

      vi.unstubAllGlobals();
    });
  });

  describe('PublishingEngineService Lifecycle', () => {
    let service: PublishingEngineService;

    beforeEach(() => {
      service = new PublishingEngineService();
    });

    it('orchestrates document export end-to-end', async () => {
      const result = await service.exportDocument(
        'html',
        sampleSource,
        { kind: 'memory' },
        { title: 'Doc Publicado' }
      );

      expect(result.ok).toBe(true);
      expect(result.artifacts[0].content).toContain('Doc Publicado');
      expect(service.getState().phase).toBe('completed');
    });

    it('returns error when exporter is not found in registry', async () => {
      const result = await service.exportDocument('formato-inexistente', sampleSource, {
        kind: 'memory',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('não encontrado');
      expect(service.getState().phase).toBe('failed');
    });

    it('supports cooperative cancellation during export', async () => {
      // Simulate cancel during job
      const exportPromise = service.exportDocument(
        'html',
        sampleSource,
        { kind: 'memory' }
      );
      service.cancelJob();
      const result = await exportPromise;

      expect(service.getState().phase).toBe('cancelled');
      expect(result.cancelled).toBe(true);
    });

    it('has EpubDocumentExporter registered in default PublishingEngineService', () => {
      const epubExp = service.getRegistry().findExporter('epub');
      expect(epubExp).not.toBeNull();
      expect(epubExp?.label).toBe('EPUB');
      expect(epubExp?.extension).toBe('epub');
    });
  });

  describe('EpubDocumentExporter (Spec 048)', () => {
    it('disables export when no active document is present', () => {
      const exporter = new EpubDocumentExporter();
      const decision = exporter.canExport({ activeDocument: null });
      expect(decision.status).toBe('disabled');
    });

    it('reports unavailable outside Tauri runtime', () => {
      const exporter = new EpubDocumentExporter();
      const decision = exporter.canExport({ activeDocument: sampleSource });
      expect(decision.status).toBe('unavailable');
      if ('reason' in decision) {
        expect(decision.reason).toContain('Tauri');
      }
    });

    it('computes default options with sanitized epub filename', () => {
      const exporter = new EpubDocumentExporter();
      const options = exporter.defaultOptions({ activeDocument: sampleSource });
      expect(options.defaultName).toBe('teste.epub');
    });
  });

  describe('Frontmatter typed author and lang (Spec 048)', () => {
    it('parses and validates author and lang in frontmatter', async () => {
      const { FrontmatterSchema, parseFrontmatter } = await import('../../src/markdown/frontmatter');
      const parsed = parseFrontmatter(`
title: Livro de Arquitetura
author: Maria Engenheira
lang: pt-BR
date: 2026-09-27
`);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.data.title).toBe('Livro de Arquitetura');
      expect(parsed.data.author).toBe('Maria Engenheira');
      expect(parsed.data.lang).toBe('pt-BR');
    });
  });
});
