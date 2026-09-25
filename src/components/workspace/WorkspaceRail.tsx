import type { ReactNode } from "react";
import "../../styles/workspace-rail.css";

export type WorkspaceActivityId = "explorer" | "search" | "todo" | "health" | string;

export interface WorkspaceActivity {
  id: WorkspaceActivityId;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  order: number;
}

export function FolderIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export const DEFAULT_ACTIVITIES: WorkspaceActivity[] = [
  {
    id: "explorer",
    label: "Explorador de Arquivos",
    icon: <FolderIcon />,
    shortcut: "Ctrl+\\",
    order: 10,
  },
];

export interface WorkspaceRailProps {
  activeActivity: WorkspaceActivityId;
  isPanelOpen: boolean;
  onToggleActivity: (id: WorkspaceActivityId) => void;
  activities?: WorkspaceActivity[];
  className?: string;
}

export function WorkspaceRail({
  activeActivity,
  isPanelOpen,
  onToggleActivity,
  activities = DEFAULT_ACTIVITIES,
  className = "",
}: WorkspaceRailProps) {
  const sortedActivities = [...activities].sort((a, b) => a.order - b.order);

  return (
    <aside
      className={`workspace-rail ${className}`.trim()}
      aria-label="Barra de atividades do workspace"
    >
      {sortedActivities.map((act) => {
        const isActive = activeActivity === act.id && isPanelOpen;
        const title = act.shortcut
          ? `${act.label} (${act.shortcut})`
          : act.label;

        return (
          <button
            key={act.id}
            type="button"
            className={`workspace-rail-btn${isActive ? " is-active" : ""}`}
            onClick={() => onToggleActivity(act.id)}
            title={title}
            aria-label={act.label}
            aria-pressed={isActive}
            data-activity-id={act.id}
          >
            <span className="workspace-rail-icon">{act.icon}</span>
          </button>
        );
      })}
    </aside>
  );
}
