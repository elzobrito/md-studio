import { describe, it, expect } from 'vitest';
import {
  aggregateWorkspaceHealth,
  filterHealthIssues,
} from '../../src/services/workspaceHealth';
import type { GraphSnapshot } from '../../src/services/knowledgeGraph';

describe('Workspace Health aggregation service', () => {
  const mockDiagnostics = [
    {
      rule: 'broken-wiki-link',
      severity: 'error' as const,
      message: 'Wiki link target not found: missing.md',
      path: 'docs/guide.md',
      line: 12,
      startCol: 1,
      endCol: 20,
      target: 'missing.md',
    },
    {
      rule: 'missing-asset',
      severity: 'error' as const,
      message: 'Asset not found on disk: assets/diagram.png',
      path: 'docs/arch.md',
      line: 25,
      startCol: 1,
      endCol: 30,
      target: 'assets/diagram.png',
    },
  ];

  const mockSnapshot: GraphSnapshot = {
    generation: 1,
    hash: 'mock-hash',
    nodes: [
      { id: 'doc:connected.md', kind: 'document', label: 'Connected', path: 'connected.md' },
      { id: 'doc:other.md', kind: 'document', label: 'Other', path: 'other.md' },
      { id: 'doc:orphan.md', kind: 'document', label: 'Orphan', path: 'orphan.md' },
    ],
    edges: [
      { from: 'doc:connected.md', to: 'doc:other.md', relation: 'LINKS_TO' },
    ],
  };

  const mockTodos = [
    { tag: 'FIXME', path: 'src/main.md', line: 10, column: 1, text: 'fix this now' },
    { tag: 'TODO', path: 'src/main.md', line: 20, column: 1, text: 'todo later' },
  ];

  it('aggregates diagnostics, graph orphans, and todos into consolidated health report', () => {
    const report = aggregateWorkspaceHealth({
      doctorDiagnostics: mockDiagnostics,
      graphSnapshot: mockSnapshot,
      annotations: mockTodos,
    });

    expect(report.counts.total).toBe(5); // 2 diagnostics + 1 orphan + 2 todos
    expect(report.counts.error).toBe(2);
    expect(report.counts.warning).toBe(1); // FIXME is warning
    expect(report.counts.info).toBe(2); // orphan + TODO

    // Categories
    expect(report.categoryCounts.broken_link).toBe(1);
    expect(report.categoryCounts.asset).toBe(1);
    expect(report.categoryCounts.orphan_document).toBe(1);
    expect(report.categoryCounts.todo).toBe(2);
  });

  it('filters health issues by severity, category, and query', () => {
    const report = aggregateWorkspaceHealth({
      doctorDiagnostics: mockDiagnostics,
      graphSnapshot: mockSnapshot,
      annotations: mockTodos,
    });

    const errorIssues = filterHealthIssues(report.issues, { severity: 'error' });
    expect(errorIssues).toHaveLength(2);

    const orphanIssues = filterHealthIssues(report.issues, { category: 'orphan_document' });
    expect(orphanIssues).toHaveLength(1);
    expect(orphanIssues[0].path).toBe('orphan.md');

    const searchIssues = filterHealthIssues(report.issues, { query: 'diagram' });
    expect(searchIssues).toHaveLength(1);
    expect(searchIssues[0].message).toContain('diagram.png');
  });
});
