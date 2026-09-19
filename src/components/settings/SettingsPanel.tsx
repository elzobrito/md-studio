import { useState, useEffect } from "react";
import { AppearanceSettings } from "./AppearanceSettings";
import { EditorSettings } from "./EditorSettings";
import { PreviewSettings } from "./PreviewSettings";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { ShortcutsSettings } from "./ShortcutsSettings";
import { AboutSettings } from "./AboutSettings";
import { settingsStore } from "../../state/settings";
import "../../styles/settings-panel.css";

type TabId = "appearance" | "editor" | "preview" | "workspace" | "shortcuts" | "about";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "appearance", label: "Aparência", icon: "🎨" },
  { id: "editor", label: "Editor", icon: "✏️" },
  { id: "preview", label: "Preview", icon: "👁️" },
  { id: "workspace", label: "Workspace", icon: "📁" },
  { id: "shortcuts", label: "Atalhos", icon: "⌨️" },
  { id: "about", label: "Sobre", icon: "ℹ️" },
];

export function SettingsPanel({ isOpen, onClose, onOpenShortcuts }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("appearance");

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

  return (
    <div
      className="settings-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Configurações"
    >
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">
            <span>⚙</span> Configurações
          </h2>
          <button
            type="button"
            className="settings-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="settings-modal-body">
          <aside className="settings-sidebar" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`settings-tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </aside>

          <main className="settings-content-pane" role="tabpanel">
            {activeTab === "appearance" && <AppearanceSettings />}
            {activeTab === "editor" && <EditorSettings />}
            {activeTab === "preview" && <PreviewSettings />}
            {activeTab === "workspace" && <WorkspaceSettings />}
            {activeTab === "shortcuts" && <ShortcutsSettings />}
            {activeTab === "about" && (
              <AboutSettings
                onOpenShortcuts={() => {
                  onClose();
                  onOpenShortcuts?.();
                }}
              />
            )}
          </main>
        </div>

        <div className="settings-modal-footer">
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={() => settingsStore.resetToDefaults()}
          >
            Restaurar Padrões
          </button>
          <button
            type="button"
            className="settings-btn-primary"
            onClick={onClose}
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
