import { useMemo } from "react";
import { computeLineDiff } from "../../services/historyDiff";
import "../../styles/preview-surface.css";

export interface PreviewDiffViewProps {
  savedContent: string;
  currentContent: string;
  fileName?: string;
}

export function PreviewDiffView({
  savedContent,
  currentContent,
  fileName = "documento",
}: PreviewDiffViewProps) {
  const diffResult = useMemo(() => {
    return computeLineDiff(savedContent, currentContent, 3);
  }, [savedContent, currentContent]);

  return (
    <div
      className="preview-diff-view"
      role="region"
      aria-label={`Comparação de alterações de ${fileName}`}
    >
      <div className="preview-diff-header">
        <span style={{ fontWeight: 600 }}>{fileName} (Alterações vs Salvo em Disco)</span>
        <div className="preview-diff-stats">
          <span className="diff-badge-added">+{diffResult.stats.added}</span>
          <span className="diff-badge-removed">-{diffResult.stats.removed}</span>
        </div>
      </div>

      {!diffResult.hasDifferences ? (
        <div className="preview-diff-empty">
          <p>Nenhuma alteração pendente em relação ao arquivo salvo em disco.</p>
        </div>
      ) : (
        <div className="diff-hunks-container">
          {diffResult.hunks.map((hunk, hunkIdx) => (
            <div key={hunkIdx} className="diff-hunk-box">
              <div className="diff-hunk-title">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </div>
              <div className="diff-hunk-lines">
                {hunk.lines.map((line, lineIdx) => {
                  const lineNum =
                    line.kind === "added"
                      ? line.newLineNumber
                      : line.kind === "removed"
                      ? line.oldLineNumber
                      : line.newLineNumber ?? line.oldLineNumber;

                  const marker =
                    line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " ";

                  return (
                    <div key={lineIdx} className={`diff-line-row ${line.kind}`}>
                      <span className="diff-line-num">{lineNum ?? ""}</span>
                      <span className="diff-line-marker">{marker}</span>
                      <span className="diff-line-text">{line.text || " "}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
