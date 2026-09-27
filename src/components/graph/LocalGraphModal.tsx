import { useState, useMemo } from 'react';
import type { EdgeRelation, GraphSnapshot } from '../../services/knowledgeGraph';
import {
  computeLocalGraphLayout,
  type LayoutPositionedNode,
} from '../../services/localGraphLayout';
import '../../styles/local-graph.css';

export interface LocalGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocPath: string;
  snapshot: GraphSnapshot;
  onNavigate: (path: string) => void;
}

const DEFAULT_RELATIONS: EdgeRelation[] = [
  'CONTAINS',
  'LINKS_TO',
  'REFERENCES',
  'USES',
  'TAGGED_AS',
];

export function LocalGraphModal({
  isOpen,
  onClose,
  activeDocPath,
  snapshot,
  onNavigate,
}: LocalGraphModalProps) {
  const [depth, setDepth] = useState<1 | 2>(1);
  const [allowedRelations, setAllowedRelations] = useState<EdgeRelation[]>(DEFAULT_RELATIONS);
  const [hoveredNode, setHoveredNode] = useState<LayoutPositionedNode | null>(null);

  const centerNodeId = useMemo(() => {
    return `doc:${activeDocPath}`;
  }, [activeDocPath]);

  const layout = useMemo(() => {
    if (!isOpen) return null;
    return computeLocalGraphLayout(snapshot.nodes, snapshot.edges, {
      centerId: centerNodeId,
      depth,
      allowedRelations,
      width: 900,
      height: 550,
      nodeCap: depth === 1 ? 60 : 120,
    });
  }, [isOpen, snapshot, centerNodeId, depth, allowedRelations]);

  if (!isOpen) return null;

  const toggleRelation = (rel: EdgeRelation) => {
    setAllowedRelations((prev) =>
      prev.includes(rel) ? prev.filter((r) => r !== rel) : [...prev, rel]
    );
  };

  const handleNodeClick = (node: LayoutPositionedNode) => {
    if (node.path) {
      onNavigate(node.path);
      onClose();
    }
  };

  return (
    <div
      className="local-graph-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Grafo Local de Relações"
      onClick={onClose}
    >
      <div className="local-graph-modal" onClick={(e) => e.stopPropagation()}>
        <div className="local-graph-header">
          <div className="local-graph-title">
            <span>🌐 Grafo Local</span>
            <span
              className={`local-graph-badge${layout?.truncated ? ' is-truncated' : ''}`}
            >
              {layout
                ? `${layout.nodes.length} nós exibidos${
                    layout.truncated ? ` (de ${layout.totalCandidateNodes})` : ''
                  }`
                : 'Carregando...'}
            </span>
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

        <div className="local-graph-controls">
          <div className="local-graph-control-group">
            <span>Profundidade:</span>
            <div className="local-graph-btn-group">
              <button
                type="button"
                className={`local-graph-btn${depth === 1 ? ' is-active' : ''}`}
                onClick={() => setDepth(1)}
              >
                1 Salto
              </button>
              <button
                type="button"
                className={`local-graph-btn${depth === 2 ? ' is-active' : ''}`}
                onClick={() => setDepth(2)}
              >
                2 Saltos
              </button>
            </div>
          </div>

          <div className="local-graph-control-group">
            <span>Relações:</span>
            {DEFAULT_RELATIONS.map((rel) => (
              <label key={rel} className="local-graph-filter-item">
                <input
                  type="checkbox"
                  checked={allowedRelations.includes(rel)}
                  onChange={() => toggleRelation(rel)}
                />
                {rel}
              </label>
            ))}
          </div>
        </div>

        <div className="local-graph-content">
          {layout && (
            <svg
              className="local-graph-svg"
              viewBox="0 0 900 550"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Edges */}
              <g className="graph-edges-layer">
                {layout.edges.map((edge, idx) => (
                  <line
                    key={`${edge.from}-${edge.to}-${idx}`}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    className={`graph-edge graph-edge-${edge.relation}`}
                  />
                ))}
              </g>

              {/* Nodes */}
              <g className="graph-nodes-layer">
                {layout.nodes.map((node) => {
                  const isCenter = node.hop === 0;
                  return (
                    <g
                      key={node.id}
                      className={`graph-node graph-node-${node.kind}${
                        isCenter ? ' graph-node-center' : ''
                      }`}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <circle className="graph-node-circle" r={node.radius} />
                      <text
                        className="graph-node-label"
                        dy={node.radius + 12}
                      >
                        {node.label.length > 20
                          ? `${node.label.slice(0, 18)}...`
                          : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>

        <div className="local-graph-footer">
          <div className="local-graph-legend">
            <span className="local-graph-legend-item">
              <span
                className="local-graph-legend-dot"
                style={{ backgroundColor: '#3b82f6' }}
              />
              Documento
            </span>
            <span className="local-graph-legend-item">
              <span
                className="local-graph-legend-dot"
                style={{ backgroundColor: '#8b5cf6' }}
              />
              Cabeçalho
            </span>
            <span className="local-graph-legend-item">
              <span
                className="local-graph-legend-dot"
                style={{ backgroundColor: '#f59e0b' }}
              />
              Bloco
            </span>
            <span className="local-graph-legend-item">
              <span
                className="local-graph-legend-dot"
                style={{ backgroundColor: '#10b981' }}
              />
              Asset
            </span>
          </div>
          <div>
            {hoveredNode
              ? `${hoveredNode.kind.toUpperCase()}: ${hoveredNode.label} (${
                  hoveredNode.path || hoveredNode.id
                })`
              : 'Clique em um nó para navegar'}
          </div>
        </div>
      </div>
    </div>
  );
}
