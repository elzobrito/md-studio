import type { Template } from "../../templates";

export interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onClick: () => void;
}

export function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <button
      type="button"
      className={`template-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      aria-label={`Modelo: ${template.label}`}
    >
      <div className="template-card-icon" aria-hidden="true">
        {template.icon}
      </div>
      <div className="template-card-title">{template.label}</div>
      <div className="template-card-desc">{template.description}</div>
    </button>
  );
}
