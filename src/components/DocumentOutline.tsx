import { useMemo, useState } from "react";
import { extractOutline } from "../services/navigation";
import { OutlineItem } from "./outline/OutlineItem";
import { useScrollTracking } from "../hooks/useScrollTracking";
import "../styles/outline.css";

interface Props {
  content: string;
  onNavigate: (slug: string) => void;
}

export function DocumentOutline({ content, onNavigate }: Props) {
  const [filter, setFilter] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const allItems = useMemo(() => extractOutline(content), [content]);
  const allSlugs = useMemo(() => allItems.map((it) => it.id), [allItems]);
  const activeSlug = useScrollTracking(allSlugs);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((it) => it.text.toLowerCase().includes(q));
  }, [allItems, filter]);

  // Determine which items have children in the original hierarchy
  const itemsWithChildFlags = useMemo(() => {
    return filteredItems.map((item, index) => {
      let hasChildren = false;
      const nextItem = allItems[allItems.findIndex((x) => x.id === item.id) + 1];
      if (nextItem && nextItem.level > item.level) {
        hasChildren = true;
      }
      return {
        ...item,
        hasChildren,
        isCollapsed: collapsedIds.has(item.id),
      };
    });
  }, [filteredItems, allItems, collapsedIds]);

  return (
    <nav className="outline outline-container" aria-label="Sumário">
      <div className="outline-header">
        <h2 className="outline-title">Sumário</h2>
        <button
          type="button"
          className="outline-collapse-all-btn"
          onClick={() => {
            if (collapsedIds.size > 0) {
              setCollapsedIds(new Set());
            } else {
              setCollapsedIds(new Set(allItems.map((i) => i.id)));
            }
          }}
          title={collapsedIds.size > 0 ? "Expandir seções" : "Colapsar seções"}
          aria-label="Alternar colapso de seções"
        >
          ≡
        </button>
      </div>

      {allItems.length > 3 && (
        <input
          type="text"
          className="outline-search"
          placeholder="🔍 Filtrar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrar headings do sumário"
        />
      )}

      {filteredItems.length === 0 ? (
        <p className="outline-empty">
          {allItems.length === 0 ? "Nenhum heading no documento." : "Nenhum heading corresponde ao filtro."}
        </p>
      ) : (
        <ul className="outline-list">
          {itemsWithChildFlags.map((it) => (
            <OutlineItem
              key={it.id}
              heading={it}
              isActive={activeSlug === it.id}
              onClick={onNavigate}
              hasChildren={it.hasChildren}
              isCollapsed={it.isCollapsed}
              onToggleCollapse={() => toggleCollapse(it.id)}
            />
          ))}
        </ul>
      )}

      <div className="outline-footer">
        <span className="outline-count">{allItems.length} headings</span>
      </div>
    </nav>
  );
}
