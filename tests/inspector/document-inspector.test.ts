import { describe, it, expect } from 'vitest';
import { buildDocumentInspection } from '../../src/services/documentInspector';

describe('Document Inspector aggregation service', () => {
  it('builds comprehensive inspection model from combined inputs', () => {
    const md = [
      '# Document Title',
      '',
      'Introduction paragraph.',
      'TODO: review intro section',
      '',
      '## Architecture',
      'Here is a paragraph with a block anchor. ^block-1',
      '',
      '### Subsystem',
      'NOTE: verify with team',
    ].join('\n');

    const result = buildDocumentInspection({
      path: 'docs/arch.md',
      markdown: md,
      metadata: {
        path: 'docs/arch.md',
        title: 'Document Title',
        headings: [],
        links: [],
        wikiLinks: [
          { target: 'guide.md', alias: 'Guide', line: 5 },
          { target: 'api.md', alias: null, line: 8 },
        ],
        tags: ['arch'],
        images: ['assets/diagram.png'],
        tables: 0,
        mermaidBlocks: 0,
        katexBlocks: 0,
        wordCount: 25,
        lineCount: 10,
        lastModified: Date.now(),
      },
      backlinks: [
        {
          sourcePath: 'readme.md',
          sourceTitle: 'README',
          occurrences: [{ sourcePath: 'readme.md', line: 12, context: 'link to arch' }],
        },
      ],
      diagnostics: [
        {
          rule: 'broken-wiki-link',
          severity: 'error',
          message: 'Wiki link target not found: missing.md',
          path: 'docs/arch.md',
          line: 7,
          startCol: 1,
          endCol: 15,
          target: 'missing.md',
        },
      ],
    });

    expect(result.path).toBe('docs/arch.md');
    expect(result.title).toBe('Document Title');

    // Metrics
    expect(result.metrics.headingCount).toBe(3);
    expect(result.metrics.outgoingLinkCount).toBe(2);
    expect(result.metrics.inboundLinkCount).toBe(1);
    expect(result.metrics.assetCount).toBe(1);
    expect(result.metrics.blockCount).toBe(1);
    expect(result.metrics.todoCount).toBe(2);
    expect(result.metrics.brokenLinkCount).toBe(1);

    // Section data
    expect(result.headings.map((h) => h.text)).toEqual([
      'Document Title',
      'Architecture',
      'Subsystem',
    ]);
    expect(result.outgoingLinks).toHaveLength(2);
    expect(result.inboundLinks).toHaveLength(1);
    expect(result.assets).toEqual(['assets/diagram.png']);
    expect(result.blocks).toEqual([{ id: 'block-1', line: 7 }]);
    expect(result.todos.map((t) => t.tag)).toEqual(['TODO', 'NOTE']);
    expect(result.brokenLinks[0].target).toBe('missing.md');
  });

  it('handles empty document gracefully with zeroed metrics', () => {
    const result = buildDocumentInspection({
      path: 'empty.md',
      markdown: '',
    });

    expect(result.path).toBe('empty.md');
    expect(result.metrics.wordCount).toBe(0);
    expect(result.metrics.headingCount).toBe(0);
    expect(result.metrics.todoCount).toBe(0);
    expect(result.metrics.brokenLinkCount).toBe(0);
  });
});
