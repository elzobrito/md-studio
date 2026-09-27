import { describe, it, expect } from 'vitest';
import {
  computeImpactReport,
  computeDependencySummary,
} from '../../src/services/impactAnalysis';
import type { GraphSnapshot } from '../../src/services/knowledgeGraph';

describe('Impact Analysis service', () => {
  const mockSnapshot: GraphSnapshot = {
    generation: 1,
    hash: 'mock-hash',
    nodes: [
      { id: 'doc:a.md', kind: 'document', label: 'Doc A', path: 'a.md' },
      { id: 'doc:b.md', kind: 'document', label: 'Doc B', path: 'b.md' },
      { id: 'doc:c.md', kind: 'document', label: 'Doc C', path: 'c.md' },
      { id: 'heading:a.md:intro', kind: 'heading', label: 'Intro', path: 'a.md' },
      { id: 'block:a.md:flow', kind: 'block', label: 'flow', path: 'a.md' },
      { id: 'asset:diagram.png', kind: 'asset', label: 'diagram.png', path: 'assets/diagram.png' },
      { id: 'doc:isolated.md', kind: 'document', label: 'Isolated', path: 'isolated.md' },
    ],
    edges: [
      // Doc A contains Heading intro and Block flow
      { from: 'doc:a.md', to: 'heading:a.md:intro', relation: 'CONTAINS' },
      { from: 'doc:a.md', to: 'block:a.md:flow', relation: 'CONTAINS' },

      // Doc B links to Doc A, and references Heading intro
      { from: 'doc:b.md', to: 'doc:a.md', relation: 'LINKS_TO' },
      { from: 'doc:b.md', to: 'heading:a.md:intro', relation: 'REFERENCES' },

      // Doc C references Block flow in Doc A, and uses diagram.png
      { from: 'doc:c.md', to: 'block:a.md:flow', relation: 'REFERENCES' },
      { from: 'doc:c.md', to: 'asset:diagram.png', relation: 'USES' },

      // Doc B also uses diagram.png
      { from: 'doc:b.md', to: 'asset:diagram.png', relation: 'USES' },
    ],
  };

  it('computes document impact report aggregating direct and subtarget dependencies', () => {
    const report = computeImpactReport(mockSnapshot, 'doc:a.md');
    expect(report).not.toBeNull();
    expect(report!.target.id).toBe('doc:a.md');

    // Affected documents should include Doc B and Doc C (deduplicated)
    expect(report!.affectedDocuments).toHaveLength(2);
    expect(report!.affectedDocuments[0].path).toBe('b.md');
    expect(report!.affectedDocuments[0].relationCount).toBe(2); // links_to doc + references heading
    expect(report!.affectedDocuments[0].occurrenceCount).toBe(2);

    expect(report!.affectedDocuments[1].path).toBe('c.md');
    expect(report!.affectedDocuments[1].relationCount).toBe(1); // references block flow
    expect(report!.affectedDocuments[1].occurrenceCount).toBe(1);

    // Verify factual risk hints
    const hintCodes = report!.riskHints.map((h) => h.code);
    expect(hintCodes).toContain('HAS_INBOUND_REFERENCES');
    expect(hintCodes).toContain('HAS_SUBTARGET_REFERENCES');
  });

  it('computes heading impact report specifically', () => {
    const report = computeImpactReport(mockSnapshot, 'heading:a.md:intro');
    expect(report).not.toBeNull();
    expect(report!.affectedDocuments).toHaveLength(1);
    expect(report!.affectedDocuments[0].path).toBe('b.md');
    expect(report!.affectedDocuments[0].occurrenceCount).toBe(1);

    const hintCodes = report!.riskHints.map((h) => h.code);
    expect(hintCodes).toContain('REFERENCED_HEADING');
  });

  it('computes block impact report specifically', () => {
    const report = computeImpactReport(mockSnapshot, 'block:a.md:flow');
    expect(report).not.toBeNull();
    expect(report!.affectedDocuments).toHaveLength(1);
    expect(report!.affectedDocuments[0].path).toBe('c.md');

    const hintCodes = report!.riskHints.map((h) => h.code);
    expect(hintCodes).toContain('REFERENCED_BLOCK');
  });

  it('computes shared asset impact report', () => {
    const report = computeImpactReport(mockSnapshot, 'asset:diagram.png');
    expect(report).not.toBeNull();
    expect(report!.affectedDocuments).toHaveLength(2); // Doc B and Doc C

    const hintCodes = report!.riskHints.map((h) => h.code);
    expect(hintCodes).toContain('SHARED_ASSET');
  });

  it('returns NO_INBOUND_REFERENCES for isolated node without false safety claim', () => {
    const report = computeImpactReport(mockSnapshot, 'doc:isolated.md');
    expect(report).not.toBeNull();
    expect(report!.affectedDocuments).toHaveLength(0);
    expect(report!.inboundEdges).toHaveLength(0);

    const hint = report!.riskHints.find((h) => h.code === 'NO_INBOUND_REFERENCES');
    expect(hint).toBeDefined();
    expect(hint!.message).toContain('Nenhuma dependência inbound');
  });

  it('computes outbound dependency summary correctly', () => {
    const deps = computeDependencySummary(mockSnapshot, 'doc:b.md');
    expect(deps).not.toBeNull();
    expect(deps!.outboundEdges).toHaveLength(3); // to doc:a, to heading:intro, to asset:diagram

    const depDocPaths = deps!.dependencyDocuments.map((d) => d.path);
    expect(depDocPaths).toContain('a.md');
  });
});
