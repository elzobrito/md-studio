import { describe, it, expect } from 'vitest';
import {
  derivePreviewCounts,
  createPreviewModel,
} from '../../src/services/importPreview';
import type {
  ImportResult,
  ImportSourceDescriptor,
  ImportAssetDescriptor,
} from '../../src/contracts/types';
import { getFidelityDescriptor } from '../../src/services/importFidelity';
import { validateRelativeDestination } from '../../src/services/importHub';

describe('Import Preview Model & Derivations (Spec 044)', () => {
  const sampleMarkdown = `
# Título Principal

Este é o primeiro parágrafo introdutório do documento importado.

## Seção de Dados

| Coluna A | Coluna B |
| --- | --- |
| Valor 1 | Valor 2 |
| Valor 3 | Valor 4 |

Outro parágrafo descritivo após a tabela de dados.

### Exemplo de Código

\`\`\`typescript
const x = 42;
console.log(x);
\`\`\`

Fim do documento.
`;

  it('accurately derives structural counts from Markdown content', () => {
    const assets: ImportAssetDescriptor[] = [
      { id: 'a1', suggestedName: 'fig1.png', byteLength: 1024, role: 'image' },
      { id: 'a2', suggestedName: 'fig2.png', byteLength: 2048, role: 'image' },
    ];

    const counts = derivePreviewCounts(sampleMarkdown, assets);

    expect(counts.headings).toBe(3); // # Título Principal, ## Seção de Dados, ### Exemplo de Código
    expect(counts.tables).toBe(1); // Pipe table
    expect(counts.codeBlocks).toBe(1); // 1 bloco ```typescript ... ```
    expect(counts.paragraphs).toBeGreaterThanOrEqual(3);
    expect(counts.assets).toBe(2);
  });

  it('handles empty markdown without crash', () => {
    const counts = derivePreviewCounts('', []);
    expect(counts.headings).toBe(0);
    expect(counts.tables).toBe(0);
    expect(counts.codeBlocks).toBe(0);
    expect(counts.paragraphs).toBe(0);
    expect(counts.assets).toBe(0);
  });

  it('creates complete ImportPreviewModel projection from ImportResult', () => {
    const source: ImportSourceDescriptor = {
      sourceId: '/caminho/externo/Relatorio_Mensal.docx',
      displayName: 'Relatorio_Mensal.docx',
      extension: 'docx',
      sizeBytes: 15000,
    };

    const result: ImportResult = {
      markdown: sampleMarkdown,
      title: 'Relatório Mensal 2026',
      assets: [],
      warnings: [
        { code: 'FONT_SUBSTITUTED', message: 'Fonte Calibri substituída por sans-serif' },
      ],
      fidelity: getFidelityDescriptor('docx'),
    };

    const model = createPreviewModel('job-42', source, result, 'ws-abc');

    expect(model.jobId).toBe('job-42');
    expect(model.title).toBe('Relatório Mensal 2026');
    expect(model.destination.workspaceId).toBe('ws-abc');
    expect(model.destination.relativeMarkdownPath).toBe('Relatório Mensal 2026.md');
    expect(model.fidelity.class).toBe('high');
    expect(model.fidelity.label).toBe('Alta');
    expect(model.warnings).toHaveLength(1);
    expect(model.warnings[0].code).toBe('FONT_SUBSTITUTED');
    expect(model.counts.headings).toBe(3);
  });

  it('enforces destination path fencing rules before commit', () => {
    // Valid destinations
    expect(validateRelativeDestination('relatorio.md').valid).toBe(true);
    expect(validateRelativeDestination('pasta/sub/doc.md').valid).toBe(true);

    // Invalid destinations (Path Fencing violations)
    expect(validateRelativeDestination('../escape.md').valid).toBe(false);
    expect(validateRelativeDestination('pasta/../../escape.md').valid).toBe(false);
    expect(validateRelativeDestination('/raiz/arquivo.md').valid).toBe(false);
    expect(validateRelativeDestination('').valid).toBe(false);
    expect(validateRelativeDestination('doc.docx').valid).toBe(false); // Must end with .md
  });
});
