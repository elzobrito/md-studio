import { useState, useMemo } from 'react';
import type { GraphSnapshot } from '../../services/knowledgeGraph';
import { findShortestPath, type PathStep } from '../../services/pathExplorer';
import '../../styles/path-explorer.css';

export interface PathExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: GraphSnapshot;
  initialFromId?: string;
  onNavigate: (path: string) => void;
}

export function PathExplorerModal({
  isOpen,
  onClose,
  snapshot,
  initialFromId,
  onNavigate,
}: PathExplorerModalProps) {
  const [fromId, setFromId] = useState<string>(initialFromId || (snapshot.nodes[0]?.id ?? ''));
  const [toId, setToId] = useState<string>(snapshot.nodes[1]?.id ?? snapshot.nodes[0]?.id ?? '');

  const pathResult = useMemo(() => {
    if (!isOpen || !fromId || !toId) return null;
    return findShortestPath(snapshot, fromId, toId);
  }, [isOpen, snapshot, fromId, toId]);

  if (!isOpen) return null;

  const handleStepClick = (step: PathStep) => {
    if (step.path) {
      onNavigate(step.path);
      onClose();
    }
  };

  return (
    <div
      className="path-explorer-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Explorador de Caminhos Relacionais"
      onClick={onClose}
    >
      <div className="path-explorer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="path-explorer-header">
          <div className="path-explorer-title">
            <span>🔍 Explorador de Relações</span>
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

        <div className="path-explorer-body">
          <div className="path-inputs-row">
            <div className="path-input-group">
              <label>Origem:</label>
              <select
                className="path-select"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
              >
                {snapshot.nodes.map((n) => (
                  <option key={`from-${n.id}`} value={n.id}>
                    [{n.kind}] {n.label} ({n.path || n.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="path-input-group">
              <label>Destino:</label>
              <select
                className="path-select"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                {snapshot.nodes.map((n) => (
                  <option key={`to-${n.id}`} value={n.id}>
                    [{n.kind}] {n.label} ({n.path || n.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="path-result-area">
            {pathResult ? (
              <div className="path-steps-list">
                {pathResult.steps.map((step, idx) => (
                  <div key={`${step.nodeId}-${idx}`}>
                    <div className="path-step-item">
                      <div
                        className="path-step-node"
                        onClick={() => handleStepClick(step)}
                        title={`Ir para ${step.path || step.label}`}
                      >
                        <span className="path-step-kind-badge">{step.kind}</span>
                        <span>{step.label}</span>
                      </div>
                    </div>
                    {step.edgeToNext && (
                      <div className="path-step-arrow">
                        <span>↓</span>
                        <span className="path-step-relation">
                          {step.edgeToNext.direction === 'backward' ? '← ' : ''}
                          {step.edgeToNext.relation}
                          {step.edgeToNext.direction === 'forward' ? ' →' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="path-empty-message">
                Nenhum caminho relacional encontrado entre os nós selecionados.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
