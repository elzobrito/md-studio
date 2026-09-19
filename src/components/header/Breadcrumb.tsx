import { buildBreadcrumb } from "../../utils/breadcrumb";
import "../../styles/breadcrumb.css";

interface Props {
  workspaceLabel: string;
  relativePath: string;
  onNavigateFolder?: (folderPath: string) => void;
}

export function Breadcrumb({ workspaceLabel, relativePath, onNavigateFolder }: Props) {
  const segments = buildBreadcrumb(workspaceLabel, relativePath);

  if (!relativePath && segments.length <= 1) {
    return null;
  }

  return (
    <nav className="breadcrumb-nav" aria-label="Navegação estrutural do arquivo">
      <ol className="breadcrumb-list">
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;

          return (
            <li
              key={seg.path || "__root__"}
              className={`breadcrumb-item${isLast ? " is-current" : ""}`}
            >
              {idx > 0 && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              )}
              <button
                type="button"
                className="breadcrumb-btn"
                onClick={() => {
                  if (seg.type === "folder" && onNavigateFolder) {
                    onNavigateFolder(seg.path);
                  }
                }}
                disabled={isLast || seg.type === "workspace"}
                title={`${seg.label} (${seg.path || workspaceLabel})`}
              >
                {seg.type === "workspace"
                  ? "📁 " + seg.label
                  : seg.type === "folder"
                    ? "📂 " + seg.label
                    : "📄 " + seg.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
