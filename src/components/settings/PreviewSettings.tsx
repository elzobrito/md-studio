import { useSettings } from "../../hooks/useSettings";
import { PREVIEW_FONT_FAMILY_OPTIONS } from "../../state/settings";

export function PreviewSettings() {
  const { previewFontSize, previewFontFamily, setPreviewFontSize, setPreviewFontFamily } =
    useSettings();

  return (
    <div className="settings-tab-content">
      <div className="settings-section" aria-label="Configurações de Preview">
        <h3 className="settings-section-title">Fonte do Preview</h3>

        <div className="settings-field">
          <label className="settings-label" htmlFor="preview-font-family-select">
            Família da Fonte
          </label>
          <select
            id="preview-font-family-select"
            className="settings-select"
            value={previewFontFamily}
            onChange={(e) => setPreviewFontFamily(e.target.value)}
          >
            {PREVIEW_FONT_FAMILY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-field">
          <div className="settings-field-header">
            <label className="settings-label" htmlFor="preview-font-size-slider">
              Tamanho da Fonte: {previewFontSize}px
            </label>
            <div className="settings-btn-group">
              <button
                type="button"
                className="settings-sm-btn"
                onClick={() => setPreviewFontSize(previewFontSize - 1)}
                disabled={previewFontSize <= 12}
                aria-label="Diminuir tamanho da fonte do preview"
              >
                -
              </button>
              <button
                type="button"
                className="settings-sm-btn"
                onClick={() => setPreviewFontSize(16)}
                aria-label="Tamanho padrão de preview"
              >
                16px
              </button>
              <button
                type="button"
                className="settings-sm-btn"
                onClick={() => setPreviewFontSize(previewFontSize + 1)}
                disabled={previewFontSize >= 32}
                aria-label="Aumentar tamanho da fonte do preview"
              >
                +
              </button>
            </div>
          </div>
          <input
            id="preview-font-size-slider"
            type="range"
            min={12}
            max={32}
            step={1}
            value={previewFontSize}
            onChange={(e) => setPreviewFontSize(parseInt(e.target.value, 10))}
            className="settings-range"
          />
        </div>

        <div
          className="font-preview-box"
          style={{
            fontFamily: previewFontFamily,
            fontSize: `${previewFontSize}px`,
            lineHeight: 1.6,
          }}
        >
          # Visão Geral do Documento
          Este é um exemplo de texto renderizado na pré-visualização formatada do MD Studio.
        </div>
      </div>
    </div>
  );
}
