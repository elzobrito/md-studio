interface Props {
  heading: {
    level: number;
    text: string;
    id: string;
  };
  isActive: boolean;
  onClick: (id: string) => void;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function OutlineItem({
  heading,
  isActive,
  onClick,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  const indent = Math.max(0, heading.level - 1) * 12;
  const badgeClass = `h${Math.min(heading.level, 6)}`;

  return (
    <li
      className={`outline-item${isActive ? " is-active" : ""}`}
      style={{ paddingLeft: `${indent + 6}px` }}
      onClick={() => onClick(heading.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(heading.id);
        }
      }}
    >
      {hasChildren && onToggleCollapse ? (
        <button
          type="button"
          className="outline-collapse-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          aria-label={isCollapsed ? "Expandir seção" : "Colapsar seção"}
        >
          {isCollapsed ? "▶" : "▼"}
        </button>
      ) : (
        <span style={{ width: 14 }} />
      )}

      <span className={`outline-badge ${badgeClass}`} aria-hidden="true">
        H{heading.level}
      </span>
      <span className="outline-text" title={heading.text}>
        {heading.text}
      </span>
      {isActive && (
        <span className="outline-active-tag" aria-label="Seção atual">
          ←ativo
        </span>
      )}
    </li>
  );
}
