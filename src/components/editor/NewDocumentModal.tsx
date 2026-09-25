import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TEMPLATES, type Template } from "../../templates";
import { TemplateCard } from "./TemplateCard";
import { Button } from "../ui/Button";
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
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedId("blank");

    const timer = setTimeout(() => {
      const btn = gridRef.current?.querySelector<HTMLButtonElement>(
        `[data-template-id="blank"]`
      );
      btn?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleConfirm = () => {
    const tpl = TEMPLATES.find((t) => t.id === selectedId) || TEMPLATES[0];
    if (tpl) {
      onSelectTemplate(tpl);
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      const currentIndex = TEMPLATES.findIndex((t) => t.id === selectedId);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % TEMPLATES.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + TEMPLATES.length) % TEMPLATES.length;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex + 3 < TEMPLATES.length) {
          nextIndex = currentIndex + 3;
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex - 3 >= 0) {
          nextIndex = currentIndex - 3;
        }
      } else if (e.key === "Enter" && !e.repeat) {
        e.preventDefault();
        handleConfirm();
        return;
      }

      if (nextIndex !== currentIndex) {
        const nextTpl = TEMPLATES[nextIndex];
        setSelectedId(nextTpl.id);
        const nextBtn = gridRef.current?.querySelector<HTMLButtonElement>(
          `[data-template-id="${nextTpl.id}"]`
        );
        nextBtn?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedId, onClose]);

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

        <div
          className="new-doc-modal-grid"
          ref={gridRef}
          role="radiogroup"
          aria-label="Modelos de documento"
        >
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

        <footer className="new-doc-modal-footer">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleConfirm}>
            Criar Documento
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
