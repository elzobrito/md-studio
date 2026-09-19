import { useSettings } from "../../hooks/useSettings";
import { FONT_FAMILY_OPTIONS } from "../../state/settings";

export function FontSettings() {
  const { fontSize, fontFamily, lineHeight, setFontSize, setFontFamily, setLineHeight } =
    useSettings();

  return (
    <div className="settings-section" aria-label="Configurações de Fonte">
      <h3 className="settings-section-title">Tipografia do Editor</h3>

      <div className="settings-field">
        <label className="settings-label" htmlFor="font-family-select">
          Família da Fonte
        </label>
        <select
          id="font-family-select"
          className="settings-select"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
        >
          {FONT_FAMILY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-field">
        <div className="settings-field-header">
          <label className="settings-label" htmlFor="font-size-slider">
            Tamanho da Fonte: {fontSize}px
          </label>
          <div className="settings-btn-group">
            <button
              type="button"
              className="settings-sm-btn"
              onClick={() => setFontSize(fontSize - 1)}
              disabled={fontSize <= 10}
              aria-label="Diminuir tamanho da fonte"
            >
              -
            </button>
            <button
              type="button"
              className="settings-sm-btn"
              onClick={() => setFontSize(14)}
              aria-label="Tamanho de fonte padrão"
            >
              14px
            </button>
            <button
              type="button"
              className="settings-sm-btn"
              onClick={() => setFontSize(fontSize + 1)}
              disabled={fontSize >= 28}
              aria-label="Aumentar tamanho da fonte"
            >
              +
            </button>
          </div>
        </div>
        <input
          id="font-size-slider"
          type="range"
          min={10}
          max={28}
          step={1}
          value={fontSize}
          onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
          className="settings-range"
        />
      </div>

      <div className="settings-field">
        <div className="settings-field-header">
          <label className="settings-label" htmlFor="line-height-slider">
            Altura da Linha: {lineHeight}
          </label>
          <button
            type="button"
            className="settings-sm-btn"
            onClick={() => setLineHeight(1.5)}
            aria-label="Altura de linha padrão"
          >
            Padrão (1.5)
          </button>
        </div>
        <input
          id="line-height-slider"
          type="range"
          min={1.1}
          max={2.2}
          step={0.1}
          value={lineHeight}
          onChange={(e) => setLineHeight(parseFloat(e.target.value))}
          className="settings-range"
        />
      </div>

      <div className="font-preview-box" style={{ fontFamily, fontSize: `${fontSize}px`, lineHeight }}>
        # Exemplo de Código
        const greeting = "Olá, MD Studio V2!";
      </div>
    </div>
  );
}
