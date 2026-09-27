import { describe, it, expect, beforeEach } from 'vitest';
import {
  bookmarkStore,
  computeContextHash,
  reanchorBookmarks,
  type Bookmark,
} from '../../src/services/bookmarkStore';

describe('Bookmarks - Context Hashing and Reanchoring', () => {
  it('computes deterministic context hash over 3-line window', () => {
    const lines = ['# Title', 'First line', 'Target line', 'Third line', 'Footer'];
    const hash1 = computeContextHash(lines, 2);
    const hash2 = computeContextHash(lines, 2);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBeGreaterThan(0);
  });

  it('reanchors bookmark when lines shift down due to insertions', () => {
    const originalLines = [
      '# Document',
      'Paragraph 1',
      'Bookmark target section',
      'Paragraph 2',
    ];
    const initialContent = originalLines.join('\n');
    const hash = computeContextHash(originalLines, 2);

    const bookmark: Bookmark = {
      id: 'bm-1',
      path: 'doc.md',
      line: 3,
      contextHash: hash,
    };

    // Simulate inserting 3 new paragraphs at the top
    const modifiedContent = [
      '# Document',
      'New paragraph A',
      'New paragraph B',
      'New paragraph C',
      'Paragraph 1',
      'Bookmark target section', // now at line 6
      'Paragraph 2',
    ].join('\n');

    const reanchored = reanchorBookmarks([bookmark], modifiedContent);
    expect(reanchored).toHaveLength(1);
    expect(reanchored[0].status).toBe('resolved');
    expect(reanchored[0].resolvedLine).toBe(6);
  });

  it('marks bookmark as ambiguous when multiple duplicate contexts exist', () => {
    const lines = [
      '# Section',
      'Item text',
      'Item text',
      'Item text',
    ];
    // Context of line 2: 'Item text' surrounded by '# Section' and 'Item text'
    // Create a scenario where multiple identical contexts exist:
    const content = [
      'Repeated A',
      'Repeated Target',
      'Repeated B',
      '',
      'Repeated A',
      'Repeated Target',
      'Repeated B',
    ].join('\n');

    const targetHash = computeContextHash(content.split('\n'), 1);
    const bookmark: Bookmark = {
      id: 'bm-dup',
      path: 'doc.md',
      line: 1, // shifted
      contextHash: targetHash,
    };

    const reanchored = reanchorBookmarks([bookmark], content);
    expect(reanchored).toHaveLength(1);
    expect(reanchored[0].status).toBe('ambiguous');
  });

  it('explicitly marks bookmark as stale when target is deleted or irretrievable', () => {
    const bookmark: Bookmark = {
      id: 'bm-deleted',
      path: 'notes.md',
      line: 42,
      contextHash: 'unmatched-hash-xyz',
    };

    const content = '# Completely different document\n\nShort content.';
    const reanchored = reanchorBookmarks([bookmark], content);
    expect(reanchored).toHaveLength(1);
    expect(reanchored[0].status).toBe('stale');
  });
});

describe('Bookmarks - BookmarkStore operations', () => {
  const wsId = 'test-workspace-bookmarks';
  const path = 'guides/getting-started.md';
  const content = [
    '# Getting Started',
    '',
    '## Installation',
    'Follow these steps...',
    '',
    '## Usage',
    'Run the command.',
  ].join('\n');

  beforeEach(() => {
    bookmarkStore.saveBookmarks(wsId, []);
  });

  it('toggles bookmark on and off', () => {
    const addResult = bookmarkStore.toggleBookmark(wsId, path, 3, content, 'Instalação');
    expect(addResult.action).toBe('added');
    expect(addResult.bookmark?.line).toBe(3);
    expect(addResult.bookmark?.label).toBe('Instalação');

    const bookmarks = bookmarkStore.getBookmarksForPath(wsId, path);
    expect(bookmarks).toHaveLength(1);

    const removeResult = bookmarkStore.toggleBookmark(wsId, path, 3, content);
    expect(removeResult.action).toBe('removed');

    const afterRemove = bookmarkStore.getBookmarksForPath(wsId, path);
    expect(afterRemove).toHaveLength(0);
  });

  it('navigates next and prev bookmarks with wrap-around', () => {
    bookmarkStore.toggleBookmark(wsId, path, 3, content);
    bookmarkStore.toggleBookmark(wsId, path, 6, content);

    const bms = bookmarkStore.getBookmarksForPath(wsId, path);
    expect(bms).toHaveLength(2);

    // Current line is 1, next should be 3
    const next1 = bookmarkStore.getNextBookmark(bms, 1);
    expect(next1?.line).toBe(3);

    // Current line is 3, next should be 6
    const next2 = bookmarkStore.getNextBookmark(bms, 3);
    expect(next2?.line).toBe(6);

    // Current line is 6, next wraps around to 3
    const nextWrap = bookmarkStore.getNextBookmark(bms, 6);
    expect(nextWrap?.line).toBe(3);

    // Current line is 6, prev should be 3
    const prev1 = bookmarkStore.getPrevBookmark(bms, 6);
    expect(prev1?.line).toBe(3);

    // Current line is 3, prev wraps around to 6
    const prevWrap = bookmarkStore.getPrevBookmark(bms, 3);
    expect(prevWrap?.line).toBe(6);
  });

  it('renames bookmark label without changing line or identity', () => {
    const addResult = bookmarkStore.toggleBookmark(wsId, path, 3, content, 'Old Label');
    const id = addResult.bookmark!.id;

    const renamed = bookmarkStore.renameBookmark(wsId, id, 'New Label');
    expect(renamed).toBe(true);

    const bms = bookmarkStore.getBookmarksForPath(wsId, path);
    expect(bms[0].label).toBe('New Label');
    expect(bms[0].id).toBe(id);
    expect(bms[0].line).toBe(3);
  });
});
