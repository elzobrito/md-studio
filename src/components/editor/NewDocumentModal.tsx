import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TEMPLATES, type Template } from "../../templates";
import { TemplateCard } from "./TemplateCard";
import "../../styles/new-document-modal.css";

export interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

export function NewDocumentModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: NewDocumentModalProps) {
  const [selectedId, setSelectedId] = useState<string>("blank");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="new-doc-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Novo Documento a partir de modelo"
    >
      <div className="new-doc-modal">
        <header className="new-doc-modal-header">
          <h2>Novo Documento</h2>
          <button
            type="button"
            className="new-doc-modal-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </header>

        <div className="new-doc-modal-grid">
          {TEMPLATES.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              isSelected={tpl.id === selectedId}
              onClick={() => {
                setSelectedId(tpl.id);
                onSelectTemplate(tpl);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
