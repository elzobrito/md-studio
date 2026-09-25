import type { Template } from "../../templates";
import { getTemplateIcon } from "./TemplateIcons";

export interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export function TemplateCard({ template, isSelected, onClick, onKeyDown }: TemplateCardProps) {
  return (
    <button
      type="button"
      className={`template-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={`Modelo: ${template.label}`}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      data-template-id={template.id}
    >
      <div className="template-card-icon" aria-hidden="true">
        {getTemplateIcon(template.id)}
      </div>
      <div className="template-card-title">{template.label}</div>
      <div className="template-card-desc">{template.description}</div>
    </button>
  );
}
