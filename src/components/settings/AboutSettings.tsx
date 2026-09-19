export function AboutSettings({ onOpenShortcuts }: { onOpenShortcuts?: () => void }) {
  return (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3 className="settings-section-title">Sobre o MD Studio</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              backgroundColor: "var(--color-accent, #89b4fa)",
              color: "#11111b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            MD
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary, #cdd6f4)" }}>
              MD Studio V2
            </h4>
            <span className="settings-hint">Versão 2.0.0 (UX & GUI Foundation)</span>
          </div>
        </div>

        <p className="settings-hint" style={{ fontSize: "12px", lineHeight: "1.5" }}>
          Editor Markdown avançado para desktop com arquitetura local-first, renderização KaTeX/Mermaid
          em tempo real e navegação fluida orientada por teclado.
        </p>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Ajuda e Referência</h3>
        <div className="settings-field">
          <label className="settings-label">Atalhos de Teclado</label>
          <span className="settings-hint">
            Consulte a lista completa de atalhos e teclas de navegação rápida do aplicativo.
          </span>
          <div>
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={onOpenShortcuts}
            >
              Ver Todos os Atalhos (F1)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
