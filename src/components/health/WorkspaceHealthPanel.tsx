import { useState, useMemo } from 'react';
import {
  filterHealthIssues,
  type HealthCategory,
  type HealthIssue,
  type HealthReport,
  type HealthSeverity,
} from '../../services/workspaceHealth';
import '../../styles/workspace-health.css';

export interface WorkspaceHealthPanelProps {
  report: HealthReport;
  onNavigate: (path: string, line?: number) => void;
}

export function WorkspaceHealthPanel({ report, onNavigate }: WorkspaceHealthPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<HealthSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<HealthCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIssues = useMemo(() => {
    return filterHealthIssues(report.issues, {
      severity: severityFilter,
      category: categoryFilter,
      query: searchQuery,
    });
  }, [report.issues, severityFilter, categoryFilter, searchQuery]);

  const getSeverityIcon = (sev: HealthSeverity) => {
    switch (sev) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
    }
  };

  return (
    <div className="workspace-health-panel" aria-label="Painel de Saúde do Workspace">
      <div className="health-header">
        <div className="health-title-row">
          <div className="health-title">
            <span>🩺 Integridade</span>
          </div>
          <div className="health-summary-badges">
            {report.counts.error > 0 && (
              <span className="health-badge health-badge-error">
                {report.counts.error} erros
              </span>
            )}
            {report.counts.warning > 0 && (
              <span className="health-badge health-badge-warning">
                {report.counts.warning} avisos
              </span>
            )}
            <span className="health-badge health-badge-info">
              {report.counts.info} info
            </span>
          </div>
        </div>

        <input
          type="search"
          className="todo-search-input"
          placeholder="Filtrar problemas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="health-filters-row">
          <select
            className="health-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
          >
            <option value="all">Todas as Severidades</option>
            <option value="error">Erros</option>
            <option value="warning">Avisos</option>
            <option value="info">Informações</option>
          </select>

          <select
            className="health-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
          >
            <option value="all">Todas as Categorias</option>
            <option value="broken_link">Links Quebrados</option>
            <option value="ambiguous_link">Links Ambíguos</option>
            <option value="orphan_document">Documentos Órfãos</option>
            <option value="asset">Assets</option>
            <option value="todo">TODOs</option>
            <option value="structural">Estrutural</option>
          </select>
        </div>
      </div>

      <div className="health-issues-list" role="list">
        {filteredIssues.length === 0 ? (
          <div className="health-empty-state">
            Nenhum problema de integridade encontrado com os filtros atuais.
          </div>
        ) : (
          filteredIssues.map((issue: HealthIssue) => (
            <div
              key={issue.id}
              className="health-issue-item"
              onClick={() => onNavigate(issue.path, issue.line)}
              role="listitem"
              title={`Ir para ${issue.path}${issue.line ? `:${issue.line}` : ''}`}
            >
              <span className="health-issue-icon">{getSeverityIcon(issue.severity)}</span>
              <div className="health-issue-body">
                <div className="health-issue-msg">{issue.message}</div>
                <div className="health-issue-meta">
                  <span>{issue.path.split('/').pop()}</span>
                  {issue.line && <span className="health-issue-loc">L{issue.line}</span>}
                  <span>•</span>
                  <span>{issue.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
