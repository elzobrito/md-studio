import "../../styles/shortcuts-modal.css";

interface ShortcutDef {
  keys: string[];
  desc: string;
  category: "Arquivo" | "Visualização" | "Navegação" | "Editor" | "Interface";
}

const SHORTCUT_DEFS: ShortcutDef[] = [
  // Arquivo
  { keys: ["Ctrl", "N"], desc: "Novo documento", category: "Arquivo" },
  { keys: ["Ctrl", "P"], desc: "Busca Rápida (Quick Switcher)", category: "Arquivo" },
  { keys: ["Ctrl", "O"], desc: "Abrir Arquivo", category: "Arquivo" },
  { keys: ["Ctrl", "Shift", "O"], desc: "Abrir Pasta", category: "Arquivo" },
  { keys: ["Ctrl", "S"], desc: "Salvar documento", category: "Arquivo" },
  { keys: ["Ctrl", "Shift", "S"], desc: "Salvar como...", category: "Arquivo" },
  { keys: ["Ctrl", "W"], desc: "Fechar arquivo", category: "Arquivo" },

  // Navegação
  { keys: ["Ctrl", "G"], desc: "Ir para linha", category: "Navegação" },
  { keys: ["Alt", "↑"], desc: "Histórico de arquivos (anterior)", category: "Navegação" },
  { keys: ["Alt", "↓"], desc: "Histórico de arquivos (próximo)", category: "Navegação" },
  { keys: ["Ctrl", "Shift", "E"], desc: "Filtrar árvore de arquivos", category: "Navegação" },

  // Visualização
  { keys: ["Ctrl", "1"], desc: "Modo Markdown (código-fonte)", category: "Visualização" },
  { keys: ["Ctrl", "2"], desc: "Modo Formatado (preview)", category: "Visualização" },
  { keys: ["Ctrl", "3"], desc: "Modo Dividida (split)", category: "Visualização" },
  { keys: ["Ctrl", "B"], desc: "Alternar Barra Lateral Esquerda", category: "Visualização" },
  { keys: ["Ctrl", "J"], desc: "Alternar Sumário", category: "Visualização" },
  { keys: ["F11"], desc: "Modo Zen (sem barras)", category: "Visualização" },
  { keys: ["Alt", "S"], desc: "Alternar sincronização de scroll", category: "Visualização" },

  // Editor
  { keys: ["Ctrl", "F"], desc: "Buscar no documento", category: "Editor" },
  { keys: ["Ctrl", "Shift", "F"], desc: "Buscar no workspace", category: "Editor" },
  { keys: ["Ctrl", "Home"], desc: "Início do documento", category: "Editor" },
  { keys: ["Ctrl", "End"], desc: "Fim do documento", category: "Editor" },

  // Interface
  { keys: ["Ctrl", ","], desc: "Configurações", category: "Interface" },
  { keys: ["Ctrl", "/"], desc: "Atalhos de teclado", category: "Interface" },
  { keys: ["F1"], desc: "Ajuda / Atalhos de teclado", category: "Interface" },
  { keys: ["Ctrl", "+"], desc: "Aumentar zoom", category: "Interface" },
  { keys: ["Ctrl", "-"], desc: "Diminuir zoom", category: "Interface" },
  { keys: ["Ctrl", "0"], desc: "Resetar zoom", category: "Interface" },
  { keys: ["Esc"], desc: "Fechar modal ativo", category: "Interface" },
];

export function ShortcutsSettings() {
  const categories: ("Arquivo" | "Visualização" | "Navegação" | "Editor" | "Interface")[] = [
    "Arquivo",
    "Visualização",
    "Navegação",
    "Editor",
    "Interface",
  ];

  return (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3 className="settings-section-title">Mapa de Atalhos de Teclado</h3>
        <p className="settings-hint">
          Todos os comandos podem ser executados rapidamente pelo teclado:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {categories.map((cat) => {
            const list = SHORTCUT_DEFS.filter((s) => s.category === cat);
            return (
              <div key={cat} className="shortcuts-category">
                <h4 style={{ fontSize: "12px", color: "var(--color-accent, #89b4fa)", margin: "0 0 6px 0" }}>
                  {cat}
                </h4>
                <ul className="shortcuts-list">
                  {list.map((item) => (
                    <li key={item.desc} className="shortcut-item">
                      <span className="shortcut-desc">{item.desc}</span>
                      <div className="shortcut-keys">
                        {item.keys.map((k) => (
                          <kbd key={k} className="shortcut-key">
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
