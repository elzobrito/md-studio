import { useState, useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { AppearanceSettings } from "./AppearanceSettings";
import { EditorSettings } from "./EditorSettings";
import { PreviewSettings } from "./PreviewSettings";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { ShortcutsSettings } from "./ShortcutsSettings";
import { AboutSettings } from "./AboutSettings";
import { settingsStore } from "../../state/settings";
import "../../styles/settings-panel.css";

export type TabId = "appearance" | "editor" | "preview" | "workspace" | "shortcuts" | "about";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

export function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function PaletteIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export function KeyboardIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="M6 8h.01" />
      <path d="M10 8h.01" />
      <path d="M14 8h.01" />
      <path d="M18 8h.01" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
      <path d="M7 16h10" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export const SETTINGS_TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "appearance", label: "Aparência", icon: <PaletteIcon /> },
  { id: "editor", label: "Editor", icon: <EditIcon /> },
  { id: "preview", label: "Preview", icon: <EyeIcon /> },
  { id: "workspace", label: "Workspace", icon: <FolderIcon /> },
  { id: "shortcuts", label: "Atalhos", icon: <KeyboardIcon /> },
  { id: "about", label: "Sobre", icon: <InfoIcon /> },
];

export function SettingsPanel({ isOpen, onClose, onOpenShortcuts }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let targetIndex = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      targetIndex = (index + 1) % SETTINGS_TABS.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      targetIndex = (index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = SETTINGS_TABS.length - 1;
    }

    if (targetIndex !== -1) {
      const nextTab = SETTINGS_TABS[targetIndex];
      setActiveTab(nextTab.id);
      tabRefs.current[targetIndex]?.focus();
    }
  };

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
            <span className="settings-header-icon" aria-hidden="true">
              <SettingsIcon />
            </span>
            <span>Configurações</span>
          </h2>
          <button
            type="button"
            className="settings-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="settings-modal-body">
          <aside className="settings-sidebar" role="tablist" aria-label="Categorias de configuração">
            {SETTINGS_TABS.map((t, idx) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`settings-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                aria-controls={`settings-tabpanel-${t.id}`}
                tabIndex={activeTab === t.id ? 0 : -1}
                className={`settings-tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                <span className="settings-tab-icon" aria-hidden="true">
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </button>
            ))}
          </aside>

          <main
            id={`settings-tabpanel-${activeTab}`}
            className="settings-content-pane"
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            tabIndex={0}
          >
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
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
