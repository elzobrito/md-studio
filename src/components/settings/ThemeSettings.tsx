import { useSettings } from "../../hooks/useSettings";
import type { ThemeMode } from "../../state/settings";

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: string; desc: string }[] = [
  { id: "dark", label: "Escuro", icon: "🌙", desc: "Tema padrão com alto contraste e baixo cansaço visual" },
  { id: "light", label: "Claro", icon: "☀️", desc: "Tema claro clássico, ideal para ambientes iluminados" },
  { id: "auto", label: "Automático", icon: "💻", desc: "Sincroniza com as preferências do seu sistema operacional" },
];

export function ThemeSettings() {
  const { theme, setTheme } = useSettings();

  return (
    <div className="settings-section" aria-label="Configurações de Tema">
      <h3 className="settings-section-title">Aparência e Cores</h3>

      <div className="theme-card-group" role="radiogroup" aria-label="Selecione o tema">
        {THEME_OPTIONS.map((opt) => {
          const isSelected = theme === opt.id;
          return (
            <div
              key={opt.id}
              className={`theme-card ${isSelected ? "selected" : ""}`}
              onClick={() => setTheme(opt.id)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setTheme(opt.id);
                }
              }}
            >
              <div className="theme-card-header">
                <span className="theme-card-icon">{opt.icon}</span>
                <strong className="theme-card-label">{opt.label}</strong>
                {isSelected && <span className="theme-card-check">✓</span>}
              </div>
              <p className="theme-card-desc">{opt.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
