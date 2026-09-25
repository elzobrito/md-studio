import { useCallback, useEffect, useMemo, useState } from "react";
import { QuickSwitcher } from "./QuickSwitcher";
import { commandRegistry } from "../../commands/commandRegistry";

interface FileItem {
  name: string;
  path: string;
}

interface Props {
  onOpenFile: (path: string) => void;
  allFiles?: FileItem[];
}

export function CommandPaletteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useMemo(() => commandRegistry.search(query), [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (commands.length > 0 ? (prev + 1) % commands.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          commands.length > 0 ? (prev - 1 + commands.length) % commands.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (commands[selectedIndex]) {
          const cmd = commands[selectedIndex];
          if (cmd.isEnabled()) {
            void cmd.execute();
          }
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, commands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
        zIndex: 9999,
      }}
    >
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "560px",
          maxWidth: "92vw",
          background: "#1e1e2e",
          color: "#cdd6f4",
          borderRadius: "8px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
          border: "1px solid #313244",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #313244" }}>
          <input
            autoFocus
            type="text"
            placeholder="Digite um comando..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#cdd6f4",
              fontSize: "15px",
            }}
          />
        </div>
        <div style={{ maxHeight: "320px", overflowY: "auto", padding: "6px 0" }}>
          {commands.length === 0 ? (
            <div style={{ padding: "12px 16px", color: "#6c7086", fontSize: "13px" }}>
              Nenhum comando encontrado
            </div>
          ) : (
            commands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onClick={() => {
                  if (cmd.isEnabled()) {
                    void cmd.execute();
                  }
                  onClose();
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 16px",
                  fontSize: "13px",
                  cursor: "pointer",
                  background: idx === selectedIndex ? "#313244" : "transparent",
                  color: idx === selectedIndex ? "#89b4fa" : "#cdd6f4",
                }}
              >
                <div>
                  {cmd.category && (
                    <span style={{ color: "#6c7086", marginRight: "8px", fontSize: "11px" }}>
                      {cmd.category} &gt;
                    </span>
                  )}
                  <span>{cmd.title}</span>
                </div>
                {cmd.shortcut && (
                  <kbd
                    style={{
                      background: "#181825",
                      border: "1px solid #45475a",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: "#a6adc8",
                    }}
                  >
                    {cmd.shortcut}
                  </kbd>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function CommandPalette({ onOpenFile, allFiles }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const closeCommand = useCallback(() => setIsCommandOpen(false), []);

  useEffect(() => {
    function handlePaletteKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsCommandOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handlePaletteKeyDown, true);
    return () => window.removeEventListener("keydown", handlePaletteKeyDown, true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <QuickSwitcher
        isOpen={isOpen}
        onClose={close}
        onSelectFile={onOpenFile}
        allFiles={allFiles}
      />
      <CommandPaletteModal
        isOpen={isCommandOpen}
        onClose={closeCommand}
      />
    </>
  );
}
