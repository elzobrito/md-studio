import { useState } from "react";
import type { SessionApi } from "../state/session";
import { ThemeSettings } from "./settings/ThemeSettings";
import { FontSettings } from "./settings/FontSettings";
import { ZoomSettings } from "./settings/ZoomSettings";

export function Settings(props: { session: SessionApi }) {
  const s = props.session;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={`card settings-card${!isExpanded ? " is-collapsed" : ""}`} aria-label="Preferências">
      <header
        className="panel-accordion-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        title={isExpanded ? "Recolher preferências" : "Expandir preferências"}
      >
        <div className="panel-accordion-title">
          <span className="accordion-chevron" aria-hidden="true">
            {isExpanded ? "▼" : "▶"}
          </span>
          <h2>Preferências</h2>
        </div>
        <span className="panel-accordion-hint">Aparência</span>
      </header>

      {isExpanded && (
        <>
          <ThemeSettings />

          <label>
            Visualização
            <select
              value={s.viewMode}
              onChange={(e) => s.setViewMode(e.target.value as "source" | "preview" | "split")}
            >
              <option value="preview">Formatado</option>
              <option value="source">Markdown</option>
              <option value="split">Dividida</option>
            </select>
          </label>
          <p className="settings-hint">Atalho: use o seletor no topo (Markdown / Formatado / Dividida).</p>

          <FontSettings />
          <ZoomSettings />
        </>
      )}
    </section>
  );
}
