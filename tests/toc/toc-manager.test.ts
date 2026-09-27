import { describe, it, expect } from 'vitest';
import {
  extractTocHeadings,
  analyzeTocState,
  generateTocContent,
  insertToc,
  updateToc,
  removeToc,
  TOC_START_MARKER,
  TOC_END_MARKER,
} from '../../src/services/tocManager';

describe('TOC Manager - Heading extraction and slug parity', () => {
  it('extracts headings and creates deterministic deduplicated slugs matching preview', () => {
    const md = [
      '# Guia do Usuário',
      '## Instalação',
      '### Linux',
      '### Windows',
      '## Instalação', // duplicate heading
      '# Conclusão',
    ].join('\n');

    const headings = extractTocHeadings(md);
    expect(headings).toHaveLength(6);
    expect(headings[0]).toEqual({ level: 1, text: 'Guia do Usuário', id: 'guia-do-usuario', line: 1 });
    expect(headings[1]).toEqual({ level: 2, text: 'Instalação', id: 'instalacao', line: 2 });
    expect(headings[2]).toEqual({ level: 3, text: 'Linux', id: 'linux', line: 3 });
    expect(headings[3]).toEqual({ level: 3, text: 'Windows', id: 'windows', line: 4 });
    expect(headings[4]).toEqual({ level: 2, text: 'Instalação', id: 'instalacao-1', line: 5 });
    expect(headings[5]).toEqual({ level: 1, text: 'Conclusão', id: 'conclusao', line: 6 });
  });

  it('strictly ignores headings in frontmatter and code fences', () => {
    const md = [
      '---',
      'title: "# Ignored Frontmatter Heading"',
      '---',
      '# Real Heading 1',
      '```markdown',
      '# Ignored Code Fence Heading',
      '## Another Fake Heading',
      '```',
      '~~~ts',
      '// # Tilde Fence Fake Heading',
      '~~~',
      '## Real Heading 2',
    ].join('\n');

    const headings = extractTocHeadings(md);
    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe('Real Heading 1');
    expect(headings[1].text).toBe('Real Heading 2');
  });
});

describe('TOC Manager - State analysis', () => {
  it('identifies clean documents with no TOC', () => {
    const md = '# Title\n\nSome text content.\n\n## Section 1\n';
    const state = analyzeTocState(md);
    expect(state.kind).toBe('none');
  });

  it('identifies managed TOC region accurately', () => {
    const md = [
      '# Document',
      '',
      TOC_START_MARKER,
      '- [Document](#document)',
      '- [Section 1](#section-1)',
      TOC_END_MARKER,
      '',
      '## Section 1',
    ].join('\n');

    const state = analyzeTocState(md);
    expect(state.kind).toBe('managed');
    if (state.kind === 'managed') {
      expect(state.region.startLine).toBe(3);
      expect(state.region.endLine).toBe(6);
    }
  });

  it('detects malformed markers (missing end or reversed)', () => {
    const missingEnd = `# Document\n\n${TOC_START_MARKER}\n- [Link](#link)\n`;
    expect(analyzeTocState(missingEnd).kind).toBe('malformed');

    const missingStart = `# Document\n\n- [Link](#link)\n${TOC_END_MARKER}\n`;
    expect(analyzeTocState(missingStart).kind).toBe('malformed');

    const reversed = `# Document\n\n${TOC_END_MARKER}\n- [Link](#link)\n${TOC_START_MARKER}\n`;
    expect(analyzeTocState(reversed).kind).toBe('malformed');
  });

  it('detects manual TOC candidate to protect manual lists from silent overwrites', () => {
    const md = [
      '# Documentation',
      '',
      'Sumário:',
      '- [Introdução](#introducao)',
      '- [Guia Rápido](#guia-rapido)',
      '- [API](#api)',
      '',
      '## Introdução',
      '## Guia Rápido',
      '## API',
    ].join('\n');

    const state = analyzeTocState(md);
    expect(state.kind).toBe('manual-candidate');
    if (state.kind === 'manual-candidate') {
      expect(state.candidates).toHaveLength(1);
      expect(state.candidates[0].items).toEqual(['Introdução', 'Guia Rápido', 'API']);
    }
  });
});

describe('TOC Manager - Generation, Insertion, Update, and Removal', () => {
  const sampleDoc = [
    '# Arquitetura',
    '## Frontend',
    '### React',
    '### CodeMirror',
    '## Backend',
    '### Tauri',
    '#### Rust Core',
  ].join('\n');

  it('generates TOC with depth filtering (default maxDepth = 3)', () => {
    const headings = extractTocHeadings(sampleDoc);
    const toc = generateTocContent(headings, { maxDepth: 3 });

    expect(toc).toContain(TOC_START_MARKER);
    expect(toc).toContain(TOC_END_MARKER);
    expect(toc).toContain('- [Arquitetura](#arquitetura)');
    expect(toc).toContain('  - [Frontend](#frontend)');
    expect(toc).toContain('    - [React](#react)');
    expect(toc).not.toContain('Rust Core'); // H4 excluded with maxDepth 3
  });

  it('generates TOC with depth filtering maxDepth = 2', () => {
    const headings = extractTocHeadings(sampleDoc);
    const toc = generateTocContent(headings, { maxDepth: 2 });

    expect(toc).toContain('- [Arquitetura](#arquitetura)');
    expect(toc).toContain('  - [Frontend](#frontend)');
    expect(toc).not.toContain('React'); // H3 excluded
  });

  it('inserts TOC at cursor position cleanly', () => {
    const doc = '# Header\n\nParagraph text.\n\n## Subheader';
    const cursor = doc.indexOf('Paragraph text.');
    const result = insertToc(doc, cursor, { maxDepth: 2 });

    expect(result.newMarkdown).toContain(TOC_START_MARKER);
    expect(result.newMarkdown).toContain('- [Header](#header)');
    expect(result.newMarkdown).toContain('- [Subheader](#subheader)');
    expect(result.newMarkdown).toContain('Paragraph text.');
  });

  it('atomically updates an existing managed TOC', () => {
    const initialDoc = [
      '# App',
      '',
      TOC_START_MARKER,
      '- [App](#app)',
      TOC_END_MARKER,
      '',
      '## Nova Seção',
      '## Outra Seção',
    ].join('\n');

    const updated = updateToc(initialDoc, { maxDepth: 2 });
    expect(updated).not.toBeNull();
    expect(updated!.newMarkdown).toContain('- [Nova Seção](#nova-secao)');
    expect(updated!.newMarkdown).toContain('- [Outra Seção](#outra-secao)');
    expect(updated!.newMarkdown).toContain(TOC_START_MARKER);
    expect(updated!.newMarkdown).toContain(TOC_END_MARKER);
  });

  it('removes an existing managed TOC completely', () => {
    const initialDoc = [
      '# App',
      '',
      TOC_START_MARKER,
      '- [App](#app)',
      TOC_END_MARKER,
      '',
      'Content remains untouched.',
    ].join('\n');

    const removed = removeToc(initialDoc);
    expect(removed).not.toBeNull();
    expect(removed!.newMarkdown).not.toContain(TOC_START_MARKER);
    expect(removed!.newMarkdown).not.toContain(TOC_END_MARKER);
    expect(removed!.newMarkdown).toContain('Content remains untouched.');
  });
});
