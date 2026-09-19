import { useSettings } from "../../hooks/useSettings";

const ZOOM_PRESETS = [75, 90, 100, 110, 125];

export function ZoomSettings() {
  const { zoom, setZoom, zoomIn, zoomOut, resetZoom } = useSettings();

  return (
    <div className="settings-section" aria-label="Configurações de Zoom">
      <h3 className="settings-section-title">Zoom da Interface</h3>

      <div className="settings-field">
        <div className="settings-field-header">
          <span className="settings-label">Zoom: {zoom}%</span>
          <div className="settings-btn-group">
            <button
              type="button"
              className="settings-sm-btn"
              onClick={zoomOut}
              disabled={zoom <= 70}
              title="Diminuir zoom (Ctrl+-)"
              aria-label="Diminuir zoom"
            >
              -
            </button>
            <button
              type="button"
              className="settings-sm-btn"
              onClick={resetZoom}
              title="Resetar zoom para 100% (Ctrl+0)"
              aria-label="Resetar zoom"
            >
              100%
            </button>
            <button
              type="button"
              className="settings-sm-btn"
              onClick={zoomIn}
              disabled={zoom >= 160}
              title="Aumentar zoom (Ctrl+=)"
              aria-label="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>

        <div className="settings-presets-group" style={{ display: "flex", gap: "6px", margin: "8px 0" }}>
          {ZOOM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`settings-sm-btn ${zoom === preset ? "active" : ""}`}
              onClick={() => setZoom(preset)}
              aria-label={`Zoom ${preset}%`}
              style={{
                borderColor: zoom === preset ? "var(--color-accent, #89b4fa)" : undefined,
                backgroundColor: zoom === preset ? "var(--color-selection, #313244)" : undefined,
                fontWeight: zoom === preset ? 600 : 400,
              }}
            >
              {preset}%
            </button>
          ))}
        </div>

        <input
          type="range"
          min={70}
          max={160}
          step={5}
          value={zoom}
          onChange={(e) => setZoom(parseInt(e.target.value, 10))}
          className="settings-range"
          aria-label="Controle de zoom"
        />
        <span className="settings-hint">
          Dica: Use os atalhos <kbd>Ctrl</kbd> + <kbd>+</kbd>, <kbd>Ctrl</kbd> + <kbd>-</kbd> e <kbd>Ctrl</kbd> + <kbd>0</kbd> a qualquer momento.
        </span>
      </div>
    </div>
  );
}

