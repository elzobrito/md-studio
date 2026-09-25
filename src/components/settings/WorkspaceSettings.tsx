import { useDocumentState } from "../../state/documentState";
import { recentFilesStore } from "../../state/recent-files";
import { settingsStore } from "../../state/settings";
import { useEffect, useState } from "react";

export function WorkspaceSettings() {
  const doc = useDocumentState();
  const [cleared, setCleared] = useState(false);
  const [showInternalFiles, setShowInternalFiles] = useState(() =>
    settingsStore.getShowInternalFiles(),
  );

  useEffect(() => {
    return settingsStore.subscribe(() => {
      setShowInternalFiles(settingsStore.getShowInternalFiles());
    });
  }, []);

  const handleClearRecent = () => {
    recentFilesStore.clear();
    setCleared(true);
    window.setTimeout(() => setCleared(false), 2000);
  };

  const handleToggleInternalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    settingsStore.setShowInternalFiles(e.target.checked);
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
        <h3 className="settings-section-title">Visualização e Arquivos</h3>
        <div className="settings-field">
          <label
            className="settings-label"
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={showInternalFiles}
              onChange={handleToggleInternalFiles}
              aria-label="Mostrar arquivos internos (.mdstudio)"
            />
            Mostrar arquivos internos (.mdstudio)
          </label>
          <p className="settings-hint">
            Exibe diretórios e arquivos de configuração interna como .mdstudio na árvore de arquivos. Arquivos internos continuam protegidos e com tratamento visual diferenciado.
          </p>
        </div>
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
