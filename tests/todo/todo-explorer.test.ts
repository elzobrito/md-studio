import { describe, it, expect } from 'vitest';
import {
  extractAnnotations,
  filterAnnotations,
  groupAnnotations,
  countByTag,
} from '../../src/services/todoExplorer';

describe('TODO Explorer - extractAnnotations', () => {
  it('extracts canonical annotations with correct line and column', () => {
    const md = [
      '# Document Title',
      '',
      'TODO: write introduction',
      'FIXME: handle null pointer',
      'NOTE: verify with QA team',
      'WARN: deprecated API in use',
      'HACK: temporary workaround',
    ].join('\n');

    const anns = extractAnnotations(md, 'docs/guide.md');
    expect(anns).toHaveLength(5);

    expect(anns[0]).toEqual({
      tag: 'TODO',
      path: 'docs/guide.md',
      line: 3,
      column: 1,
      text: 'write introduction',
    });

    expect(anns[1]).toEqual({
      tag: 'FIXME',
      path: 'docs/guide.md',
      line: 4,
      column: 1,
      text: 'handle null pointer',
    });

    expect(anns[2]).toEqual({
      tag: 'NOTE',
      path: 'docs/guide.md',
      line: 5,
      column: 1,
      text: 'verify with QA team',
    });

    expect(anns[3]).toEqual({
      tag: 'WARN',
      path: 'docs/guide.md',
      line: 6,
      column: 1,
      text: 'deprecated API in use',
    });

    expect(anns[4]).toEqual({
      tag: 'HACK',
      path: 'docs/guide.md',
      line: 7,
      column: 1,
      text: 'temporary workaround',
    });
  });

  it('handles allowed prefixes (headings, lists, blockquotes, checkboxes, indentation)', () => {
    const md = [
      '## TODO: section heading todo',
      '- FIXME: list item fixme',
      '* NOTE: asterisk list note',
      '1. WARN: numbered list warn',
      '> HACK: blockquote hack',
      '  - [ ] TODO: task checkbox item',
      'TODO:', // empty text
    ].join('\n');

    const anns = extractAnnotations(md, 'notes.md');
    expect(anns).toHaveLength(7);

    expect(anns[0].tag).toBe('TODO');
    expect(anns[0].text).toBe('section heading todo');
    expect(anns[0].column).toBe(4); // "## " is 3 chars, col is 4

    expect(anns[1].tag).toBe('FIXME');
    expect(anns[1].text).toBe('list item fixme');

    expect(anns[2].tag).toBe('NOTE');
    expect(anns[2].text).toBe('asterisk list note');

    expect(anns[3].tag).toBe('WARN');
    expect(anns[3].text).toBe('numbered list warn');

    expect(anns[4].tag).toBe('HACK');
    expect(anns[4].text).toBe('blockquote hack');

    expect(anns[5].tag).toBe('TODO');
    expect(anns[5].text).toBe('task checkbox item');

    expect(anns[6].tag).toBe('TODO');
    expect(anns[6].text).toBe('');
  });

  it('strictly ignores code fences (``` and ~~~)', () => {
    const md = [
      'TODO: outside fence',
      '```ts',
      '// TODO: inside code fence',
      '/* FIXME: inside comment */',
      '```',
      '~~~markdown',
      'NOTE: inside tilde fence',
      '~~~',
      'WARN: after fence',
    ].join('\n');

    const anns = extractAnnotations(md, 'code.md');
    expect(anns).toHaveLength(2);
    expect(anns[0].tag).toBe('TODO');
    expect(anns[0].line).toBe(1);
    expect(anns[1].tag).toBe('WARN');
    expect(anns[1].line).toBe(9);
  });

  it('strictly ignores frontmatter and inline code', () => {
    const md = [
      '---',
      'title: My Spec',
      'description: TODO: in frontmatter',
      '---',
      'Normal paragraph.',
      '`TODO: in inline code`',
      'Another prose sentence mentioning TODO: in the middle of a sentence.',
      'TODO: genuine annotation',
    ].join('\n');

    const anns = extractAnnotations(md, 'spec.md');
    expect(anns).toHaveLength(1);
    expect(anns[0].tag).toBe('TODO');
    expect(anns[0].line).toBe(8);
    expect(anns[0].text).toBe('genuine annotation');
  });

  it('strictly ignores math blocks ($$)', () => {
    const md = [
      '$$',
      'TODO: math expression',
      '$$',
      'NOTE: genuine note',
    ].join('\n');

    const anns = extractAnnotations(md, 'math.md');
    expect(anns).toHaveLength(1);
    expect(anns[0].tag).toBe('NOTE');
    expect(anns[0].line).toBe(4);
  });

  it('supports custom tags when provided', () => {
    const md = [
      'REVIEW: need review from architects',
      'BUG: unexpected crash',
      'TODO: standard todo',
    ].join('\n');

    const anns = extractAnnotations(md, 'arch.md', {
      customTags: ['REVIEW', 'BUG'],
    });

    expect(anns).toHaveLength(3);
    expect(anns.map((a) => a.tag)).toEqual(['REVIEW', 'BUG', 'TODO']);
  });
});

describe('TODO Explorer - filtering and grouping', () => {
  const sampleAnnotations = [
    { tag: 'TODO', path: 'src/main.ts', line: 10, column: 1, text: 'refactor this' },
    { tag: 'FIXME', path: 'src/main.ts', line: 25, column: 3, text: 'memory leak' },
    { tag: 'TODO', path: 'docs/readme.md', line: 5, column: 1, text: 'update screenshots' },
    { tag: 'NOTE', path: 'docs/readme.md', line: 40, column: 1, text: 'see architecture doc' },
    { tag: 'WARN', path: 'docs/api.md', line: 12, column: 1, text: 'unstable endpoint' },
  ];

  it('filters by tag', () => {
    const filtered = filterAnnotations(sampleAnnotations, { tag: 'TODO' });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((a) => a.tag === 'TODO')).toBe(true);
  });

  it('filters by folder', () => {
    const filtered = filterAnnotations(sampleAnnotations, { folder: 'docs/' });
    expect(filtered).toHaveLength(3);
    expect(filtered.every((a) => a.path.startsWith('docs/'))).toBe(true);
  });

  it('filters by textual query across text, tag and path', () => {
    const filtered = filterAnnotations(sampleAnnotations, { query: 'leak' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].text).toBe('memory leak');
  });

  it('groups annotations by file', () => {
    const grouped = groupAnnotations(sampleAnnotations, 'file');
    expect(grouped).toHaveLength(3);
    expect(grouped.find((g) => g.key === 'src/main.ts')?.count).toBe(2);
    expect(grouped.find((g) => g.key === 'docs/readme.md')?.count).toBe(2);
    expect(grouped.find((g) => g.key === 'docs/api.md')?.count).toBe(1);
  });

  it('groups annotations by tag', () => {
    const grouped = groupAnnotations(sampleAnnotations, 'tag');
    expect(grouped).toHaveLength(4);
    expect(grouped[0].key).toBe('TODO');
    expect(grouped[0].count).toBe(2);
  });

  it('counts annotations per tag accurately', () => {
    const counts = countByTag(sampleAnnotations);
    expect(counts).toEqual({
      TODO: 2,
      FIXME: 1,
      NOTE: 1,
      WARN: 1,
    });
  });
});
