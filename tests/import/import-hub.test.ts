import { describe, it, expect, beforeEach } from 'vitest';
import {
  ImporterRegistry,
  BuiltinTextDocumentImporter,
  ImportHubService,
  sanitizeMarkdownFilename,
  validateRelativeDestination,
  type DocumentImporter,
} from '../../src/services/importHub';
import type { ImportSourceDescriptor, ImportResult } from '../../src/contracts/types';
import { getFidelityDescriptor } from '../../src/services/importFidelity';

describe('Import Hub Core (Spec 042)', () => {
  let registry: ImporterRegistry;

  beforeEach(() => {
    registry = new ImporterRegistry();
  });

  describe('ImporterRegistry', () => {
    it('registers and retrieves importers', () => {
      const builtin = new BuiltinTextDocumentImporter();
      registry.register(builtin);

      expect(registry.getImporters()).toHaveLength(1);
      expect(registry.getImporters()[0].id).toBe('builtin-text-importer');
    });

    it('matches supported source format', () => {
      const builtin = new BuiltinTextDocumentImporter();
      registry.register(builtin);

      const htmlSource: ImportSourceDescriptor = {
        sourceId: 'src-1',
        displayName: 'page.html',
        extension: 'html',
        sizeBytes: 1024,
      };

      const found = registry.findImporter(htmlSource);
      expect(found).not.toBeNull();
      expect(found?.id).toBe('builtin-text-importer');
    });

    it('returns null for unsupported source format', () => {
      const builtin = new BuiltinTextDocumentImporter();
      registry.register(builtin);

      const unsupportedSource: ImportSourceDescriptor = {
        sourceId: 'src-2',
        displayName: 'video.mp4',
        extension: 'mp4',
        sizeBytes: 50000,
      };

      expect(registry.findImporter(unsupportedSource)).toBeNull();
    });

    it('aggregates capabilities across registered importers', () => {
      registry.register(new BuiltinTextDocumentImporter());
      const caps = registry.getCapabilities();
      expect(caps).toHaveLength(1);
      expect(caps[0].formats.some((f) => f.formatId === 'html')).toBe(true);
    });
  });

  describe('Filename Sanitizer and Path Fencing', () => {
    it('sanitizes unsafe raw filenames for markdown', () => {
      expect(sanitizeMarkdownFilename('Meu Relatório/2026..draft.docx')).toBe(
        'Meu Relatório-2026draft.md'
      );
      expect(sanitizeMarkdownFilename('../../../etc/passwd')).toBe('etc-passwd.md');
      expect(sanitizeMarkdownFilename('')).toBe('documento-importado.md');
      expect(sanitizeMarkdownFilename('artigo.html')).toBe('artigo.md');
    });

    it('validates safe relative destination paths within workspace', () => {
      expect(validateRelativeDestination('artigo.md').valid).toBe(true);
      expect(validateRelativeDestination('docs/secao/guia.md').valid).toBe(true);
    });

    it('rejects absolute paths and path traversal escapes (Path Fencing)', () => {
      expect(validateRelativeDestination('/etc/hosts.md').valid).toBe(false);
      expect(validateRelativeDestination('C:/Windows/file.md').valid).toBe(false);
      expect(validateRelativeDestination('../outside.md').valid).toBe(false);
      expect(validateRelativeDestination('docs/../../outside.md').valid).toBe(false);
      expect(validateRelativeDestination('').valid).toBe(false);
      expect(validateRelativeDestination('documento.txt').valid).toBe(false);
    });
  });

  describe('ImportHubService Job Lifecycle', () => {
    let service: ImportHubService;

    beforeEach(() => {
      service = new ImportHubService();
    });

    it('executes end-to-end import lifecycle: start -> convert -> commit', async () => {
      const source: ImportSourceDescriptor = {
        sourceId: 'src-test-1',
        displayName: 'relatorio.html',
        extension: 'html',
        sizeBytes: 2048,
      };

      // 1. Iniciar Job
      const job = service.startJob(source);
      expect(job.phase).toBe('validating');
      expect(job.source?.displayName).toBe('relatorio.html');

      // 2. Converter (Converter != Gravar: sem I/O no workspace de destino ainda)
      const result = await service.convertCurrentJob();
      expect(result.markdown).toContain('# Documento Importado');
      expect(result.fidelity.class).toBe('high');
      expect(result.fidelity.label).toBe('Alta');
      expect(service.getCurrentJob().phase).toBe('ready');

      // 3. Commit no workspace sob Path Fencing
      let savedPath = '';
      let savedContent = '';
      const commitRes = await service.commitCurrentJob(
        {
          workspaceId: 'ws-123',
          relativeMarkdownPath: 'docs/relatorio.md',
        },
        {
          saveFn: async (dest, content) => {
            savedPath = dest.relativeMarkdownPath;
            savedContent = content;
            return {
              workspaceId: dest.workspaceId,
              relativePath: dest.relativeMarkdownPath,
              content,
              encoding: 'utf-8',
              mtimeMs: Date.now(),
              contentHash: 'hash123',
              version: 1,
            };
          },
        }
      );

      expect(commitRes.ok).toBe(true);
      expect(savedPath).toBe('docs/relatorio.md');
      expect(savedContent).toContain('# Documento Importado');
      expect(service.getCurrentJob().phase).toBe('completed');
    });

    it('rejects commit outside workspace via Path Fencing', async () => {
      const source: ImportSourceDescriptor = {
        sourceId: 'src-escape',
        displayName: 'escape.html',
        extension: 'html',
        sizeBytes: 100,
      };

      service.startJob(source);
      await service.convertCurrentJob();

      const commitRes = await service.commitCurrentJob({
        workspaceId: 'ws-1',
        relativeMarkdownPath: '../malicious.md',
      });

      expect(commitRes.ok).toBe(false);
      if (!commitRes.ok) {
        expect(commitRes.code).toBe('OutsideWorkspace');
      }
    });

    it('supports cooperative cancellation without partial write', async () => {
      const source: ImportSourceDescriptor = {
        sourceId: 'src-cancel',
        displayName: 'large.html',
        extension: 'html',
        sizeBytes: 100000,
      };

      service.startJob(source);
      service.cancelJob();

      expect(service.getCurrentJob().phase).toBe('cancelled');
      await expect(service.convertCurrentJob()).rejects.toThrow('Importação cancelada pelo usuário');
    });

    it('fails gracefully when format has no registered importer', async () => {
      const source: ImportSourceDescriptor = {
        sourceId: 'src-unsupported',
        displayName: 'unknown.xyz',
        extension: 'xyz',
        sizeBytes: 1234,
      };

      service.startJob(source);
      await expect(service.convertCurrentJob()).rejects.toThrow('não suportado');
      expect(service.getCurrentJob().phase).toBe('failed');
    });
  });
});
