import { formatRelativeTime, useRecentFiles } from "../../hooks/useRecentFiles";

interface Props {
  onOpenFile: (path: string) => void;
  max?: number;
}

export function RecentFiles({ onOpenFile, max = 20 }: Props) {
  const { recentFiles } = useRecentFiles();
  const displayFiles = recentFiles.slice(0, max);

  if (displayFiles.length === 0) {
    return null;
  }

  return (
    <div className="recent-files-section">
      <h3 className="recent-files-title">Recentes</h3>
      <ul className="recent-files-list">
        {displayFiles.map((file) => (
          <li key={file.path} className="recent-file-item">
            <button
              type="button"
              className="recent-file-btn"
              onClick={() => onOpenFile(file.path)}
              title={file.path}
            >
              <span className="recent-file-icon" aria-hidden="true">
                📄
              </span>
              <span className="recent-file-name">{file.name}</span>
              <span className="recent-file-time">
                {formatRelativeTime(file.openedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
