import type { DoctorDiagnostic } from '../types/metadata';
import type { GraphSnapshot } from './knowledgeGraph';
import type { Annotation } from './todoExplorer';

export type HealthSeverity = 'error' | 'warning' | 'info';
export type HealthCategory =
  | 'broken_link'
  | 'ambiguous_link'
  | 'orphan_document'
  | 'asset'
  | 'todo'
  | 'structural';

export interface HealthIssue {
  id: string;
  category: HealthCategory;
  severity: HealthSeverity;
  message: string;
  path: string;
  line?: number;
  col?: number;
  target?: string;
  provider: 'doctor' | 'graph' | 'todo';
}

export interface HealthFilterOptions {
  severity?: HealthSeverity | 'all';
  category?: HealthCategory | 'all';
  query?: string;
}

export interface HealthReport {
  issues: HealthIssue[];
  counts: {
    total: number;
    error: number;
    warning: number;
    info: number;
  };
  categoryCounts: Record<HealthCategory, number>;
}

export interface AggregateHealthInput {
  doctorDiagnostics?: DoctorDiagnostic[];
  graphSnapshot?: GraphSnapshot;
  annotations?: Annotation[];
}

/**
 * Aggregates workspace integrity health issues combining diagnostics from
 * MD Doctor, Knowledge Graph orphans and TODO Explorer.
 */
export function aggregateWorkspaceHealth(input: AggregateHealthInput): HealthReport {
  const issues: HealthIssue[] = [];

  // 1. Process MD Doctor diagnostics
  if (input.doctorDiagnostics) {
    for (const diag of input.doctorDiagnostics) {
      let category: HealthCategory = 'structural';
      if (diag.rule.includes('broken') || diag.rule.includes('missing-link')) {
        category = 'broken_link';
      } else if (diag.rule.includes('ambiguous')) {
        category = 'ambiguous_link';
      } else if (diag.rule.includes('asset') || diag.rule.includes('image')) {
        category = 'asset';
      }

      issues.push({
        id: `diag:${diag.path}:${diag.line}:${diag.rule}`,
        category,
        severity: diag.severity,
        message: diag.message,
        path: diag.path,
        line: diag.line,
        col: diag.startCol,
        target: diag.target || undefined,
        provider: 'doctor',
      });
    }
  }

  // 2. Discover orphan documents from Knowledge Graph
  if (input.graphSnapshot) {
    const docNodes = input.graphSnapshot.nodes.filter((n) => n.kind === 'document');
    const connectedDocIds = new Set<string>();

    for (const edge of input.graphSnapshot.edges) {
      if (edge.relation === 'LINKS_TO' || edge.relation === 'REFERENCES') {
        if (edge.from.startsWith('doc:')) connectedDocIds.add(edge.from);
        if (edge.to.startsWith('doc:')) connectedDocIds.add(edge.to);
      }
    }

    for (const doc of docNodes) {
      if (!connectedDocIds.has(doc.id)) {
        issues.push({
          id: `orphan:${doc.id}`,
          category: 'orphan_document',
          severity: 'info',
          message: 'Documento isolado sem links de entrada nem de saída.',
          path: doc.path || doc.id,
          provider: 'graph',
        });
      }
    }
  }

  // 3. Process TODO annotations
  if (input.annotations) {
    for (const ann of input.annotations) {
      const severity: HealthSeverity =
        ann.tag === 'FIXME' || ann.tag === 'WARN' ? 'warning' : 'info';

      issues.push({
        id: `todo:${ann.path}:${ann.line}:${ann.column}:${ann.tag}`,
        category: 'todo',
        severity,
        message: `[${ann.tag}] ${ann.text || 'Pendente de revisão'}`,
        path: ann.path,
        line: ann.line,
        col: ann.column,
        provider: 'todo',
      });
    }
  }

  // Calculate counts
  const counts = {
    total: issues.length,
    error: 0,
    warning: 0,
    info: 0,
  };

  const categoryCounts: Record<HealthCategory, number> = {
    broken_link: 0,
    ambiguous_link: 0,
    orphan_document: 0,
    asset: 0,
    todo: 0,
    structural: 0,
  };

  for (const issue of issues) {
    counts[issue.severity]++;
    categoryCounts[issue.category]++;
  }

  return {
    issues,
    counts,
    categoryCounts,
  };
}

/**
 * Filters health issues by severity, category, and textual query.
 */
export function filterHealthIssues(
  issues: HealthIssue[],
  options: HealthFilterOptions
): HealthIssue[] {
  const { severity, category, query } = options;
  const q = query?.trim().toLowerCase();

  return issues.filter((iss) => {
    if (severity && severity !== 'all' && iss.severity !== severity) {
      return false;
    }
    if (category && category !== 'all' && iss.category !== category) {
      return false;
    }
    if (q) {
      const inMsg = iss.message.toLowerCase().includes(q);
      const inPath = iss.path.toLowerCase().includes(q);
      const inCat = iss.category.toLowerCase().includes(q);
      if (!inMsg && !inPath && !inCat) return false;
    }
    return true;
  });
}
