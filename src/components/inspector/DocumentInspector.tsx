import { useState } from 'react';
import type { DocumentInspection } from '../../services/documentInspector';
import '../../styles/document-inspector.css';

export interface DocumentInspectorProps {
  inspection: DocumentInspection;
  onNavigateLine?: (line: number) => void;
  onOpenRelative?: (path: string) => void;
}

export function DocumentInspector({
  inspection,
  onNavigateLine,
  onOpenRelative,
}: DocumentInspectorProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    headings: true,
    outgoing: true,
    inbound: true,
    blocks: false,
    assets: false,
    todos: true,
    broken: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const { metrics } = inspection;

  return (
    <div className="document-inspector" aria-label="Inspetor de Documento">
      <div className="inspector-header">
        <div className="inspector-title">
          <span>{inspection.title || 'Documento'}</span>
        </div>
        <div className="inspector-path">{inspection.path}</div>
      </div>

      <div className="inspector-metrics-grid">
        <div className="inspector-metric-card">
          <span className="inspector-metric-val">{metrics.wordCount}</span>
          <span className="inspector-metric-lbl">Palavras</span>
        </div>
        <div className="inspector-metric-card">
          <span className="inspector-metric-val">{metrics.lineCount}</span>
          <span className="inspector-metric-lbl">Linhas</span>
        </div>
        <div className="inspector-metric-card">
          <span className="inspector-metric-val">{metrics.headingCount}</span>
          <span className="inspector-metric-lbl">Seções</span>
        </div>
        <div className="inspector-metric-card">
          <span className="inspector-metric-val">{metrics.outgoingLinkCount}</span>
          <span className="inspector-metric-lbl">Links Out</span>
        </div>
        <div className="inspector-metric-card">
          <span className="inspector-metric-val">{metrics.inboundLinkCount}</span>
          <span className="inspector-metric-lbl">Backlinks</span>
        </div>
        <div className="inspector-metric-card">
          <span className="inspector-metric-val">{metrics.todoCount}</span>
          <span className="inspector-metric-lbl">TODOs</span>
        </div>
      </div>

      {/* Headings */}
      <div className="inspector-section">
        <div
          className="inspector-section-header"
          onClick={() => toggleSection('headings')}
        >
          <span className="inspector-section-title">
            <span>{openSections.headings ? '▾' : '▸'}</span>
            <span>Cabeçalhos</span>
          </span>
          <span className="inspector-section-badge">{inspection.headings.length}</span>
        </div>
        {openSections.headings && (
          <div className="inspector-section-content">
            {inspection.headings.length === 0 ? (
              <div className="inspector-empty-section">Nenhum cabeçalho</div>
            ) : (
              inspection.headings.map((h, i) => (
                <div
                  key={`${h.id}-${i}`}
                  className="inspector-item"
                  onClick={() => onNavigateLine?.(h.line)}
                >
                  <span className="inspector-item-label" style={{ paddingLeft: (h.level - 1) * 8 }}>
                    <span>H{h.level}</span>
                    <span>{h.text}</span>
                  </span>
                  <span className="inspector-item-line">L{h.line}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Outgoing Links */}
      <div className="inspector-section">
        <div
          className="inspector-section-header"
          onClick={() => toggleSection('outgoing')}
        >
          <span className="inspector-section-title">
            <span>{openSections.outgoing ? '▾' : '▸'}</span>
            <span>Links de Saída</span>
          </span>
          <span className="inspector-section-badge">{inspection.outgoingLinks.length}</span>
        </div>
        {openSections.outgoing && (
          <div className="inspector-section-content">
            {inspection.outgoingLinks.length === 0 ? (
              <div className="inspector-empty-section">Nenhum link de saída</div>
            ) : (
              inspection.outgoingLinks.map((link, i) => (
                <div
                  key={`${link.target}-${i}`}
                  className="inspector-item"
                  onClick={() => onOpenRelative?.(link.target)}
                >
                  <span className="inspector-item-label">
                    <span>↗</span>
                    <span>{link.alias ? `${link.alias} (${link.target})` : link.target}</span>
                  </span>
                  <span className="inspector-item-line">L{link.line}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Inbound Links */}
      <div className="inspector-section">
        <div
          className="inspector-section-header"
          onClick={() => toggleSection('inbound')}
        >
          <span className="inspector-section-title">
            <span>{openSections.inbound ? '▾' : '▸'}</span>
            <span>Links de Entrada (Backlinks)</span>
          </span>
          <span className="inspector-section-badge">{inspection.inboundLinks.length}</span>
        </div>
        {openSections.inbound && (
          <div className="inspector-section-content">
            {inspection.inboundLinks.length === 0 ? (
              <div className="inspector-empty-section">Nenhum backlink</div>
            ) : (
              inspection.inboundLinks.map((link, i) => (
                <div
                  key={`${link.sourcePath}-${link.line}-${i}`}
                  className="inspector-item"
                  onClick={() => onOpenRelative?.(link.sourcePath)}
                >
                  <span className="inspector-item-label">
                    <span>↙</span>
                    <span>{link.sourceTitle || link.sourcePath}</span>
                  </span>
                  <span className="inspector-item-line">L{link.line}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Blocks */}
      <div className="inspector-section">
        <div
          className="inspector-section-header"
          onClick={() => toggleSection('blocks')}
        >
          <span className="inspector-section-title">
            <span>{openSections.blocks ? '▾' : '▸'}</span>
            <span>Blocos Ancorados</span>
          </span>
          <span className="inspector-section-badge">{inspection.blocks.length}</span>
        </div>
        {openSections.blocks && (
          <div className="inspector-section-content">
            {inspection.blocks.length === 0 ? (
              <div className="inspector-empty-section">Nenhum bloco ancorado</div>
            ) : (
              inspection.blocks.map((b, i) => (
                <div
                  key={`${b.id}-${i}`}
                  className="inspector-item"
                  onClick={() => b.line && onNavigateLine?.(b.line)}
                >
                  <span className="inspector-item-label">
                    <span>^</span>
                    <span>{b.id}</span>
                  </span>
                  {b.line && <span className="inspector-item-line">L{b.line}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Assets */}
      <div className="inspector-section">
        <div
          className="inspector-section-header"
          onClick={() => toggleSection('assets')}
        >
          <span className="inspector-section-title">
            <span>{openSections.assets ? '▾' : '▸'}</span>
            <span>Recursos e Mídia</span>
          </span>
          <span className="inspector-section-badge">{inspection.assets.length}</span>
        </div>
        {openSections.assets && (
          <div className="inspector-section-content">
            {inspection.assets.length === 0 ? (
              <div className="inspector-empty-section">Nenhum asset referenciado</div>
            ) : (
              inspection.assets.map((ast, i) => (
                <div key={`${ast}-${i}`} className="inspector-item">
                  <span className="inspector-item-label">
                    <span>🖼️</span>
                    <span>{ast}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* TODOs */}
      <div className="inspector-section">
        <div
          className="inspector-section-header"
          onClick={() => toggleSection('todos')}
        >
          <span className="inspector-section-title">
            <span>{openSections.todos ? '▾' : '▸'}</span>
            <span>Pendências (TODOs)</span>
          </span>
          <span className="inspector-section-badge">{inspection.todos.length}</span>
        </div>
        {openSections.todos && (
          <div className="inspector-section-content">
            {inspection.todos.length === 0 ? (
              <div className="inspector-empty-section">Nenhuma pendência neste arquivo</div>
            ) : (
              inspection.todos.map((t, i) => (
                <div
                  key={`${t.line}-${i}`}
                  className="inspector-item"
                  onClick={() => onNavigateLine?.(t.line)}
                >
                  <span className="inspector-item-label">
                    <strong>{t.tag}:</strong>
                    <span>{t.text || 'Sem descrição'}</span>
                  </span>
                  <span className="inspector-item-line">L{t.line}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Broken Links */}
      {inspection.brokenLinks.length > 0 && (
        <div className="inspector-section">
          <div
            className="inspector-section-header"
            onClick={() => toggleSection('broken')}
          >
            <span className="inspector-section-title">
              <span>{openSections.broken ? '▾' : '▸'}</span>
              <span className="inspector-item-danger">Links Quebrados</span>
            </span>
            <span className="inspector-section-badge" style={{ color: '#ef4444' }}>
              {inspection.brokenLinks.length}
            </span>
          </div>
          {openSections.broken && (
            <div className="inspector-section-content">
              {inspection.brokenLinks.map((bl, i) => (
                <div
                  key={`${bl.target}-${i}`}
                  className="inspector-item inspector-item-danger"
                  onClick={() => onNavigateLine?.(bl.line)}
                >
                  <span className="inspector-item-label">
                    <span>⚠️</span>
                    <span>{bl.message || bl.target}</span>
                  </span>
                  <span className="inspector-item-line">L{bl.line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
