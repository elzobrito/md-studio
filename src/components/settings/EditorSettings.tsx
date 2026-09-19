import { useEffect, useState } from "react";
import { FontSettings } from "./FontSettings";
import { useSettings } from "../../hooks/useSettings";
import { settingsStore } from "../../state/settings";

export function EditorSettings() {
  const { lineWrapping, lineNumbers, setLineWrapping, setLineNumbers } = useSettings();
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
      </div>
    </div>
  );
}
