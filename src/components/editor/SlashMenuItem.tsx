import type { SlashItem } from "../../editor/slash/slash-items";

export interface SlashMenuItemProps {
  item: SlashItem;
  isSelected: boolean;
  onSelect: (item: SlashItem) => void;
  onMouseEnter: () => void;
}

export function SlashMenuItem({
  item,
  isSelected,
  onSelect,
  onMouseEnter,
}: SlashMenuItemProps) {
  return (
    <button
      type="button"
      className={`slash-menu-item ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(item)}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
    >
      <div className="slash-item-icon" aria-hidden="true">
        {item.icon}
      </div>
      <div className="slash-item-content">
        <span className="slash-item-label">{item.label}</span>
        <span className="slash-item-description">{item.description}</span>
      </div>
    </button>
  );
}
