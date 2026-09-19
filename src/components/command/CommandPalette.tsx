import { useCallback, useEffect, useState } from "react";
import { QuickSwitcher } from "./QuickSwitcher";

interface FileItem {
  name: string;
  path: string;
}

interface Props {
  onOpenFile: (path: string) => void;
  allFiles?: FileItem[];
}

export function CommandPalette({ onOpenFile, allFiles }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

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
    <QuickSwitcher
      isOpen={isOpen}
      onClose={close}
      onSelectFile={onOpenFile}
      allFiles={allFiles}
    />
  );
}
