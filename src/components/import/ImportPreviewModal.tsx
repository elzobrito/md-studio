import React, { useState, useEffect } from "react";
import type { ImportDestination } from "../../contracts/types";
import { type ImportPreviewModel } from "../../services/importPreview";
import { validateRelativeDestination } from "../../services/importHub";
import "../../styles/import-preview.css";

export interface ImportPreviewModalProps {
  model: ImportPreviewModel;
  onCommit: (destination: ImportDestination, overwrite: boolean) => Promise<void>;
  onCancel: () => void;
  isCommitting?: boolean;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  model,
  onCommit,
  onCancel,
  isCommitting = false,
}) => {
  const [activeTab, setActiveTab] = useState<"formatted" | "raw">("formatted");
  const [destinationPath, setDestinationPath] = useState(
    model.destination.relativeMarkdownPath
  );
  const [overwrite, setOverwrite] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);

  useEffect(() => {
    const val = validateRelativeDestination(destinationPath);
    if (!val.valid) {
      setPathError(val.reason || "Caminho inválido");
    } else {
      setPathError(null);
    }
  }, [destinationPath]);

  const handleCommit = async () => {
    if (pathError) return;
    await onCommit(
      {
        workspaceId: model.destination.workspaceId,
        relativeMarkdownPath: destinationPath,
      },
      overwrite
    );
  };

  const fidelityClass = `fidelity-${model.fidelity.class}`;

  return (
    <div className="import-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="import-preview-title">
      <div className="import-preview-dialog">
        <header className="import-preview-header">
          <div className="import-preview-title-row">
            <span className="import-preview-format-tag">
              {model.source.extension || "doc"}
            </span>
            <h2 id="import-preview-title">
              Revisão de Importação: {model.title || model.source.displayName}
            </h2>
          </div>
          <span
            className={`import-preview-fidelity-badge ${fidelityClass}`}
            title={model.fidelity.explanation}
          >
            Fidelidade: {model.fidelity.label}
          </span>
        </header>

        <div className="import-preview-fidelity-explanation">
          💡 {model.fidelity.explanation}
        </div>

        <div className="import-preview-summary-bar">
          <div className="import-preview-metrics">
            <span>
              Títulos: <strong>{model.counts.headings}</strong>
            </span>
            <span>
              Tabelas: <strong>{model.counts.tables}</strong>
            </span>
            <span>
              Blocos de Código: <strong>{model.counts.codeBlocks}</strong>
            </span>
            <span>
              Anexos: <strong>{model.counts.assets}</strong>
            </span>
            {model.warnings.length > 0 && (
              <span style={{ color: "#f87171" }}>
                Avisos: <strong>{model.warnings.length}</strong>
              </span>
            )}
          </div>

          <div className="import-preview-tabs">
            <button
              type="button"
              className={`import-preview-tab-btn ${activeTab === "formatted" ? "active" : ""}`}
              onClick={() => setActiveTab("formatted")}
            >
              Visualização Formatada
            </button>
            <button
              type="button"
              className={`import-preview-tab-btn ${activeTab === "raw" ? "active" : ""}`}
              onClick={() => setActiveTab("raw")}
            >
              Markdown Bruto
            </button>
          </div>
        </div>

        {model.warnings.length > 0 && (
          <div className="import-preview-warnings-list" role="region" aria-label="Avisos de importação">
            {model.warnings.map((w, idx) => (
              <div key={idx} className="import-preview-warning-item">
                ⚠️ <strong>[{w.code}]</strong> {w.message}
              </div>
            ))}
          </div>
        )}

        <div className="import-preview-content">
          {activeTab === "raw" ? (
            <textarea
              className="import-preview-raw-text"
              readOnly
              value={model.markdown}
              aria-label="Markdown Bruto"
            />
          ) : (
            <div className="import-preview-rendered" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {/* Preview em modo estritamente read-only e seguro */}
              {model.markdown}
            </div>
          )}
        </div>

        <footer className="import-preview-footer">
          <div className="import-preview-destination-box">
            <label htmlFor="import-dest-input">Destino no Workspace (.md):</label>
            <input
              id="import-dest-input"
              type="text"
              className="import-preview-destination-input"
              value={destinationPath}
              onChange={(e) => setDestinationPath(e.target.value)}
              placeholder="docs/documento.md"
              disabled={isCommitting}
            />
            {pathError && <div className="import-preview-error-msg">{pathError}</div>}
          </div>

          <div className="import-preview-actions">
            <button
              type="button"
              className="import-preview-btn-cancel"
              onClick={onCancel}
              disabled={isCommitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="import-preview-btn-commit"
              onClick={handleCommit}
              disabled={Boolean(pathError) || isCommitting}
            >
              {isCommitting ? "Gravando..." : "Criar Documento .md"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
