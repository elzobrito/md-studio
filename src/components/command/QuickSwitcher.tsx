import { useEffect, useMemo, useRef, useState } from "react";
import { useRecentFiles } from "../../hooks/useRecentFiles";
import { fuzzySearch } from "../../utils/fuzzy-search";
import "../../styles/command-palette.css";

interface FileItem {
  name: string;
  path: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string) => void;
  allFiles?: FileItem[];
}

function getDirectoryBadge(filePath: string): string {
  const lastSlash = filePath.lastIndexOf("/");
  if (lastSlash === -1) return "./";
  return filePath.slice(0, lastSlash + 1);
}

export function QuickSwitcher({ isOpen, onClose, onSelectFile, allFiles = [] }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { recentFiles } = useRecentFiles();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const recentItems = useMemo(() => {
    return recentFiles.map((rf) => ({ name: rf.name, path: rf.path }));
  }, [recentFiles]);

  const { recentSection, allSection, flattenedItems } = useMemo(() => {
    const q = query.trim();
    let recents: FileItem[] = [];
    let others: FileItem[] = [];

    const recentPathSet = new Set(recentItems.map((r) => r.path));

    if (!q) {
      recents = recentItems;
      others = allFiles.filter((f) => !recentPathSet.has(f.path)).slice(0, 20);
    } else {
      recents = fuzzySearch(q, recentItems);
      const remainingFiles = allFiles.filter((f) => !recentPathSet.has(f.path));
      others = fuzzySearch(q, remainingFiles);
    }

    const flat: FileItem[] = [...recents, ...others];
    return {
      recentSection: recents,
      allSection: others,
      flattenedItems: flat,
    };
  }, [query, recentItems, allFiles]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [flattenedItems]);

  useEffect(() => {
    if (!isOpen) return;

    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          flattenedItems.length > 0 ? (prev + 1) % flattenedItems.length : 0,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          flattenedItems.length > 0
            ? (prev - 1 + flattenedItems.length) % flattenedItems.length
            : 0,
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (flattenedItems.length > 0 && flattenedItems[selectedIndex]) {
          onSelectFile(flattenedItems[selectedIndex].path);
          onClose();
        }
        return;
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, flattenedItems, selectedIndex, onSelectFile, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(".command-palette-item.is-selected");
    if (selectedEl && typeof (selectedEl as HTMLElement).scrollIntoView === "function") {
      (selectedEl as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let runningIndex = 0;

  return (
    <div
      className="command-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Abrir arquivo rapidamente"
    >
      <div className="command-palette-modal">
        <div className="command-palette-input-box">
          <span className="command-palette-icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Abrir arquivo... (digite para filtrar)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {flattenedItems.length === 0 ? (
          <div className="command-palette-empty">Nenhum arquivo correspondente.</div>
        ) : (
          <ul className="command-palette-results" ref={listRef} role="listbox">
            {recentSection.length > 0 && (
              <>
                <li className="command-palette-section-header" role="presentation">
                  RECENTES
                </li>
                {recentSection.map((item) => {
                  const itemIndex = runningIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <li
                      key={`recent-${item.path}`}
                      className={`command-palette-item${isSelected ? " is-selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onSelectFile(item.path);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="command-palette-item-left">
                        <span className="command-palette-marker" aria-hidden="true">
                          {isSelected ? ">" : " "}
                        </span>
                        <span className="command-palette-item-name">{item.name}</span>
                      </div>
                      <span className="command-palette-item-path">
                        {getDirectoryBadge(item.path)}
                      </span>
                    </li>
                  );
                })}
              </>
            )}

            {allSection.length > 0 && (
              <>
                <li className="command-palette-section-header" role="presentation">
                  TODOS OS ARQUIVOS
                </li>
                {allSection.map((item) => {
                  const itemIndex = runningIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <li
                      key={`all-${item.path}`}
                      className={`command-palette-item${isSelected ? " is-selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onSelectFile(item.path);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="command-palette-item-left">
                        <span className="command-palette-marker" aria-hidden="true">
                          {isSelected ? ">" : " "}
                        </span>
                        <span className="command-palette-item-name">{item.name}</span>
                      </div>
                      <span className="command-palette-item-path">
                        {getDirectoryBadge(item.path)}
                      </span>
                    </li>
                  );
                })}
              </>
            )}
          </ul>
        )}

        <div className="command-palette-footer">
          <span>
            <kbd>↑↓</kbd> Navegar
          </span>
          <span>
            <kbd>↵</kbd> Abrir
          </span>
          <span>
            <kbd>Esc</kbd> Fechar
          </span>
        </div>
      </div>
    </div>
  );
}
