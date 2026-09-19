import { useEffect, useRef } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenDifferent: () => void;
  onOpenFile: () => void;
}

export function WorkspaceMenu({ isOpen, onClose, onOpenDifferent, onOpenFile }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="workspace-menu-dropdown" ref={menuRef} role="menu">
      <button
        type="button"
        className="workspace-menu-item"
        role="menuitem"
        onClick={() => {
          onClose();
          onOpenDifferent();
        }}
      >
        <span>📁</span> Abrir pasta diferente
      </button>
      <button
        type="button"
        className="workspace-menu-item"
        role="menuitem"
        onClick={() => {
          onClose();
          onOpenFile();
        }}
      >
        <span>📄</span> Abrir arquivo avulso
      </button>
    </div>
  );
}
