import type { SessionApi } from "../state/session";
import { ThemeSettings } from "./settings/ThemeSettings";
import { FontSettings } from "./settings/FontSettings";
import { ZoomSettings } from "./settings/ZoomSettings";

export function Settings(props: { session: SessionApi }) {
  const s = props.session;
  return (
    <section className="card" aria-label="Preferências">
      <h2>Preferências</h2>
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
    </section>
  );
}
