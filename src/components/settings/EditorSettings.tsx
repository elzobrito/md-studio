import { useEffect, useState } from "react";
import { FontSettings } from "./FontSettings";
import { useSettings } from "../../hooks/useSettings";
import { settingsStore } from "../../state/settings";

export function EditorSettings() {
  const {
    lineWrapping,
    lineNumbers,
    splitScrollSync,
    autoSave,
    autoSaveDelay,
    setLineWrapping,
    setLineNumbers,
    setSplitScrollSync,
    setAutoSave,
    setAutoSaveDelay,
  } = useSettings();
  const [smartPaste, setSmartPasteState] = useState(() => settingsStore.getState().smartPaste);

  useEffect(() => {
    return settingsStore.subscribe(() => {
      setSmartPasteState(settingsStore.getState().smartPaste);
    });
  }, []);

  return (
    <div className="settings-tab-content">
      <FontSettings />

      <div className="settings-section">
        <h3 className="settings-section-title">Comportamento do Editor</h3>
        <div className="settings-field">
          <label className="settings-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={lineWrapping}
              onChange={(e) => setLineWrapping(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Quebra de Linha (Soft Wrap): {lineWrapping ? "Ativado" : "Desativado"}</span>
          </label>
          <span className="settings-hint">
            Quebra automática de linha para conforto de leitura sem rolagem horizontal.
          </span>
        </div>

        <div className="settings-field">
          <label className="settings-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={lineNumbers}
              onChange={(e) => setLineNumbers(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Números de Linha: {lineNumbers ? "Visíveis" : "Ocultos"}</span>
          </label>
          <span className="settings-hint">
            Exibe o número das linhas na margem esquerda do editor para facilitar navegação via Ctrl+G.
          </span>
        </div>

        <div className="settings-field">
          <label className="settings-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={smartPaste}
              onChange={(e) => settingsStore.setSmartPaste(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Smart Paste: {smartPaste ? "Ativado" : "Desativado"}</span>
          </label>
          <span className="settings-hint">
            Converte automaticamente conteúdo HTML copiado da web para Markdown limpo ao colar.
          </span>
        </div>

        <div className="settings-field">
          <label className="settings-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={splitScrollSync}
              onChange={(e) => setSplitScrollSync(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Rolagem dupla na vista Dividida: {splitScrollSync ? "Ativada" : "Desativada"}</span>
          </label>
          <span className="settings-hint">
            Quando ligada, o editor e o preview rolam juntos no modo Dividida. A barra de status mostra Sync ON ou OFF e o atalho Alt+S grava a mesma preferência.
          </span>
        </div>

        <div className="settings-field">
          <label className="settings-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Auto-Save (Salvamento no Disco): {autoSave ? "Ativado" : "Desativado"}</span>
          </label>
          <span className="settings-hint">
            Salva alterações automaticamente no arquivo físico com debounce. O salvamento manual (Ctrl+S) continua sempre disponível.
          </span>
        </div>

        {autoSave && (
          <div className="settings-field" style={{ marginLeft: "24px" }}>
            <label className="settings-label" htmlFor="autosave-delay-select">
              Intervalo de Salvamento Automático:
            </label>
            <select
              id="autosave-delay-select"
              className="settings-select"
              value={autoSaveDelay}
              onChange={(e) => setAutoSaveDelay(Number(e.target.value))}
              style={{ marginTop: "6px", maxWidth: "240px" }}
            >
              <option value={1000}>1 segundo (rápido)</option>
              <option value={1500}>1.5 segundo (recomendado)</option>
              <option value={2000}>2 segundos</option>
              <option value={3000}>3 segundos</option>
              <option value={5000}>5 segundos</option>
            </select>
            <span className="settings-hint">
              Tempo de espera após a última tecla digitada antes de gravar silenciosamente no disco.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
