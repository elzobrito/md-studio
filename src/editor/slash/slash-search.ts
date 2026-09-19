import type { SlashItem } from "./slash-items";

export function filterSlashItems(query: string, items: SlashItem[]): SlashItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items;

  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(trimmed) ||
      item.description.toLowerCase().includes(trimmed) ||
      item.keywords.some((k) => k.toLowerCase().includes(trimmed))
  );
}
