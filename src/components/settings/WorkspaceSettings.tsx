import { useDocumentState } from "../../state/documentState";
import { recentFilesStore } from "../../state/recent-files";
import { useState } from "react";

export function WorkspaceSettings() {
  const doc = useDocumentState();
  const [cleared, setCleared] = useState(false);

  const handleClearRecent = () => {
    recentFilesStore.clear();
    setCleared(true);
    window.setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3 className="settings-section-title">Workspace Ativo</h3>
        <div className="settings-field">
          <label className="settings-label">Pasta Raiz</label>
          <div className="font-preview-box">
            {doc.workspace?.rootLabel ?? "Nenhum workspace aberto no momento"}
          </div>
        </div>

        {doc.relativePath && (
          <div className="settings-field">
            <label className="settings-label">Arquivo Atual</label>
            <div className="font-preview-box">{doc.relativePath}</div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Histórico e Privacidade</h3>
        <div className="settings-field">
          <label className="settings-label">Arquivos Recentes</label>
          <p className="settings-hint">
            Limpar a lista de arquivos recentes não altera nenhum arquivo no disco.
          </p>
          <div>
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={handleClearRecent}
            >
              {cleared ? "✓ Histórico Limpo!" : "Limpar Histórico de Recentes"}
            </button>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-label">Princípio Local-First & Proteção</label>
          <span className="settings-hint">
            O MD Studio V2 opera com filosofia Local-first estrita. O aplicativo jamais realiza
            exclusão, movimentação ou renomeação estrutural no seu sistema de arquivos.
          </span>
        </div>
      </div>
    </div>
  );
}
