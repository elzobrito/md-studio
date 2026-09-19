import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SLASH_ITEMS, type SlashItem } from "../../editor/slash/slash-items";
import { filterSlashItems } from "../../editor/slash/slash-search";
import type { SlashState } from "../../editor/slash/slash-plugin";
import { SlashMenuItem } from "./SlashMenuItem";
import "../../styles/slash-menu.css";

export interface SlashMenuProps {
  slashState: SlashState | null;
  onSelect: (item: SlashItem) => void;
  onClose: () => void;
}

export function SlashMenu({ slashState, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!slashState) return [];
    return filterSlashItems(slashState.query, SLASH_ITEMS);
  }, [slashState?.query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [slashState?.query]);

  // Keep selected item visible in scroll
  useEffect(() => {
    if (!menuRef.current) return;
    const selectedEl = menuRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!slashState || !slashState.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
        );
      } else if (e.key === "Enter") {
        if (filteredItems.length > 0 && filteredItems[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [slashState, filteredItems, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!slashState?.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [slashState?.isOpen, onClose]);

  if (!slashState || !slashState.isOpen) return null;

  // Calculate menu position
  const coords = slashState.coords;
  const style: React.CSSProperties = coords
    ? {
        top: `${coords.bottom + 6}px`,
        left: `${Math.max(16, Math.min(coords.left, window.innerWidth - 340))}px`,
      }
    : {
        top: "20%",
        left: "30%",
      };

  return createPortal(
    <div
      ref={menuRef}
      className="slash-menu"
      style={style}
      role="listbox"
      aria-label="Comandos de inserção rápida"
    >
      {filteredItems.length === 0 ? (
        <div className="slash-menu-empty">Nenhum comando encontrado</div>
      ) : (
        filteredItems.map((item, index) => (
          <SlashMenuItem
            key={item.id}
            item={item}
            isSelected={index === selectedIndex}
            onSelect={onSelect}
            onMouseEnter={() => setSelectedIndex(index)}
          />
        ))
      )}
    </div>,
    document.body
  );
}
