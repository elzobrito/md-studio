import { useEffect } from "react";
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
  { keys: ["Ctrl", "O"], desc: "Abrir arquivo", category: "Arquivo" },
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
  { keys: ["Shift", "Alt", "F"], desc: "Formatar bloco de código", category: "Editor" },

  // Interface
  { keys: ["Ctrl", ","], desc: "Configurações", category: "Interface" },
  { keys: ["Ctrl", "/"], desc: "Atalhos de teclado", category: "Interface" },
  { keys: ["F1"], desc: "Ajuda / Atalhos de teclado", category: "Interface" },
  { keys: ["Ctrl", "+"], desc: "Aumentar zoom", category: "Interface" },
  { keys: ["Ctrl", "-"], desc: "Diminuir zoom", category: "Interface" },
  { keys: ["Ctrl", "0"], desc: "Resetar zoom", category: "Interface" },
  { keys: ["Esc"], desc: "Fechar modal ativo", category: "Interface" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories: ("Arquivo" | "Visualização" | "Navegação" | "Editor" | "Interface")[] = [
    "Arquivo",
    "Visualização",
    "Navegação",
    "Editor",
    "Interface",
  ];

  return (
    <div
      className="shortcuts-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Atalhos de teclado"
    >
      <div className="shortcuts-modal">
        <div className="shortcuts-modal-header">
          <h2 className="shortcuts-modal-title">Atalhos de Teclado</h2>
          <button
            type="button"
            className="shortcuts-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="shortcuts-modal-body">
          {categories.map((cat) => {
            const list = SHORTCUT_DEFS.filter((s) => s.category === cat);
            return (
              <div key={cat} className="shortcuts-category">
                <h3 className="shortcuts-category-title">{cat}</h3>
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
