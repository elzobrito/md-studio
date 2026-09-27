import { useMemo } from 'react';
import type { GraphSnapshot } from '../../services/knowledgeGraph';
import type { Annotation } from '../../services/todoExplorer';
import {
  calculateWorkspaceAnalytics,
} from '../../services/workspaceAnalytics';
import '../../styles/workspace-analytics.css';

export interface WorkspaceAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: GraphSnapshot;
  todos?: Annotation[];
  onOpenDocument?: (path: string) => void;
}

export function WorkspaceAnalyticsModal({
  isOpen,
  onClose,
  snapshot,
  todos = [],
  onOpenDocument,
}: WorkspaceAnalyticsModalProps) {
  const analytics = useMemo(() => {
    if (!isOpen) return null;
    return calculateWorkspaceAnalytics(snapshot, todos);
  }, [isOpen, snapshot, todos]);

  if (!isOpen || !analytics) return null;

  const { overview, explainers, topReferenced, topCentral } = analytics;

  return (
    <div
      className="workspace-analytics-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Métricas e Estatísticas do Workspace"
      onClick={onClose}
    >
      <div className="workspace-analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <div className="analytics-title">
            <span>📊 Workspace Analytics</span>
          </div>
          <button
            type="button"
            className="right-panel-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="analytics-content">
          {/* Overview Grid */}
          <div className="analytics-overview-grid">
            <div className="analytics-card">
              <span className="analytics-card-val">{overview.totalDocuments}</span>
              <span className="analytics-card-lbl">Docs</span>
            </div>
            <div className="analytics-card">
              <span className="analytics-card-val">{overview.totalHeadings}</span>
              <span className="analytics-card-lbl">Headings</span>
            </div>
            <div className="analytics-card">
              <span className="analytics-card-val">{overview.totalLinks}</span>
              <span className="analytics-card-lbl">Links</span>
            </div>
            <div className="analytics-card">
              <span className="analytics-card-val">{overview.totalAssets}</span>
              <span className="analytics-card-lbl">Assets</span>
            </div>
            <div className="analytics-card">
              <span className="analytics-card-val">{overview.totalTodos}</span>
              <span className="analytics-card-lbl">TODOs</span>
            </div>
            <div className="analytics-card">
              <span className="analytics-card-val">{overview.linkDensity}</span>
              <span className="analytics-card-lbl">Densidade</span>
            </div>
          </div>

          {/* Metric Explainers */}
          <div className="analytics-explainers-section">
            <div className="analytics-section-title">Critérios e Fórmulas Explicáveis</div>
            {explainers.map((exp) => (
              <div key={exp.key} className="analytics-explainer-item">
                <div>
                  <strong>{exp.name}:</strong> {exp.description}
                  <div className="analytics-formula">Fórmula: {exp.formula}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-primary)' }}>
                  {exp.value}
                </div>
              </div>
            ))}
          </div>

          {/* Rankings */}
          <div className="analytics-rank-tables">
            <div className="analytics-rank-box">
              <div className="analytics-section-title">Mais Referenciados (Inbound)</div>
              {topReferenced.slice(0, 5).map((doc, idx) => (
                <div
                  key={`ref-${doc.id}`}
                  className="analytics-rank-row"
                  onClick={() => {
                    onOpenDocument?.(doc.path);
                    onClose();
                  }}
                  title={`Abrir ${doc.path}`}
                >
                  <div>
                    <span className="analytics-rank-num">#{idx + 1}</span>
                    <span>{doc.label}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {doc.inboundLinks} refs
                  </span>
                </div>
              ))}
            </div>

            <div className="analytics-rank-box">
              <div className="analytics-section-title">Maior Centralidade de Grau</div>
              {topCentral.slice(0, 5).map((doc, idx) => (
                <div
                  key={`cen-${doc.id}`}
                  className="analytics-rank-row"
                  onClick={() => {
                    onOpenDocument?.(doc.path);
                    onClose();
                  }}
                  title={`Abrir ${doc.path}`}
                >
                  <div>
                    <span className="analytics-rank-num">#{idx + 1}</span>
                    <span>{doc.label}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {doc.centralityScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
