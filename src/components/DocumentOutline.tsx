import React, { useMemo, useState } from "react";
import { extractOutline } from "../services/navigation";
import { OutlineItem } from "./outline/OutlineItem";
import { useScrollTracking } from "../hooks/useScrollTracking";
import { uiStore } from "../state/ui";
import "../styles/outline.css";

interface Props {
  content: string;
  onNavigate: (slug: string, line?: number) => void;
  onClose?: () => void;
  cursorLine?: number;
}

export function DocumentOutline({ content, onNavigate, onClose, cursorLine }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState("");
  const [maxDepth, setMaxDepth] = useState<number>(6); // 1 = H1, 2 = H1-H2, 3 = H1-H3, 6 = Todos
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Um único parse por mudança no conteúdo. Scroll tracking não reparseia o documento.
  const allItems = useMemo(() => extractOutline(content), [content]);
  const allSlugs = useMemo(() => allItems.map((it) => it.id), [allItems]);
  const scrollActiveSlug = useScrollTracking(allSlugs);

  // Determinar se há subtópicos (filhos) no documento para habilitar o colapso interno
  const hasSubsections = useMemo(() => {
    return allItems.some((it, idx) => {
      const next = allItems[idx + 1];
      return next && next.level > it.level;
    });
  }, [allItems]);

  // Se houver cursorLine no editor, encontrar o heading ativo mais próximo
  const activeSlug = useMemo(() => {
    if (cursorLine !== undefined && allItems.length > 0) {
      let current = allItems[0].id;
      for (const item of allItems) {
        if (item.line !== undefined && item.line <= cursorLine) {
          current = item.id;
        } else if (item.line !== undefined && item.line > cursorLine) {
          break;
        }
      }
      return current;
    }
    return scrollActiveSlug;
  }, [cursorLine, allItems, scrollActiveSlug]);

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

  // Filtragem por texto e por profundidade H1/H2/H3+
  const filteredItems = useMemo(() => {
    let list = allItems;
    if (maxDepth < 6) {
      list = list.filter((it) => it.level <= maxDepth);
    }
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter((it) => it.text.toLowerCase().includes(q));
    }
    return list;
  }, [allItems, maxDepth, filter]);

  // Hierarquia e visibilidade de filhos recolhidos
  const itemsWithChildFlags = useMemo(() => {
    const hiddenSlugs = new Set<string>();

    // Marcar filhos de itens colapsados como ocultos
    if (collapsedIds.size > 0 && !filter) {
      let currentCollapsedLevel = -1;
      for (const item of allItems) {
        if (currentCollapsedLevel !== -1) {
          if (item.level > currentCollapsedLevel) {
            hiddenSlugs.add(item.id);
            continue;
          } else {
            currentCollapsedLevel = -1;
          }
        }
        if (collapsedIds.has(item.id)) {
          currentCollapsedLevel = item.level;
        }
      }
    }

    return filteredItems
      .filter((item) => !hiddenSlugs.has(item.id))
      .map((item) => {
        let hasChildren = false;
        const idx = allItems.findIndex((x) => x.id === item.id);
        const nextItem = allItems[idx + 1];
        if (nextItem && nextItem.level > item.level) {
          hasChildren = true;
        }
        return {
          ...item,
          hasChildren,
          isCollapsed: collapsedIds.has(item.id),
        };
      });
  }, [filteredItems, allItems, collapsedIds, filter]);

  return (
    <nav className="outline outline-container" aria-label="Sumário">
      <div className="outline-header">
        <button
          type="button"
          className="outline-accordion-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          title={isExpanded ? "Colapsar seções" : "Expandir seções"}
        >
          <span className="accordion-chevron" aria-hidden="true">
            {isExpanded ? "▼" : "▶"}
          </span>
          <h2 className="outline-title">Sumário</h2>
          <span className="outline-header-count">({allItems.length})</span>
        </button>
        <div className="outline-header-actions">
          <button
            type="button"
            className="outline-collapse-all-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Colapsar seções" : "Expandir seções"}
            aria-label={isExpanded ? "Colapsar seções" : "Expandir seções"}
            aria-expanded={isExpanded}
          >
            ≡
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Controles de Profundidade H1 / H2 / H3 / Todos */}
          <div
            className="outline-depth-controls"
            style={{
              display: "flex",
              gap: "4px",
              padding: "4px 8px",
              borderBottom: "1px solid #313244",
              fontSize: "11px",
            }}
          >
            <span style={{ color: "#a6adc8", alignSelf: "center", marginRight: "2px" }}>Nível:</span>
            {[
              { label: "H1", val: 1 },
              { label: "H2", val: 2 },
              { label: "H3", val: 3 },
              { label: "Todos", val: 6 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => setMaxDepth(btn.val)}
                style={{
                  background: maxDepth === btn.val ? "#89b4fa" : "#181825",
                  color: maxDepth === btn.val ? "#11111b" : "#cdd6f4",
                  border: "1px solid #313244",
                  borderRadius: "3px",
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontWeight: maxDepth === btn.val ? 600 : 400,
                }}
              >
                {btn.label}
              </button>
            ))}
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
                  onClick={(id) => onNavigate(id, it.line)}
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
        </>
      )}
    </nav>
  );
}
