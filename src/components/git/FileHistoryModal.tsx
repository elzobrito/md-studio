import React, { useState, useEffect } from "react";
import { ipc } from "../../lib/ipc/client";
import type { GitCommitSummary } from "../../contracts/types";
import { computeLineDiff, type HistoryDiffResult } from "../../services/historyDiff";
import "../../styles/git-history.css";

export interface FileHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  relativePath: string;
  currentContent: string;
}

export const FileHistoryModal: React.FC<FileHistoryModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  relativePath,
  currentContent,
}) => {
  const [commits, setCommits] = useState<GitCommitSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<GitCommitSummary | null>(null);
  const [commitContent, setCommitContent] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<HistoryDiffResult | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    if (!isOpen || !workspaceId || !relativePath) return;

    setLoading(true);
    void (async () => {
      try {
        const history = await ipc.gitGetFileHistory(workspaceId, relativePath, 30);
        setCommits(history);
        if (history.length > 0) {
          setSelectedCommit(history[0]);
        } else {
          setSelectedCommit(null);
        }
      } catch (err) {
        console.error("Failed to fetch git file history:", err);
        setCommits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, workspaceId, relativePath]);

  useEffect(() => {
    if (!selectedCommit || !workspaceId || !relativePath) {
      setCommitContent(null);
      setDiffResult(null);
      return;
    }

    setLoadingDiff(true);
    void (async () => {
      try {
        const content = await ipc.gitGetFileAtCommit(
          workspaceId,
          relativePath,
          selectedCommit.hash,
        );
        setCommitContent(content);
        const diff = computeLineDiff(content, currentContent);
        setDiffResult(diff);
      } catch (err) {
        console.error("Failed to load file at commit:", err);
        setCommitContent(null);
        setDiffResult(null);
      } finally {
        setLoadingDiff(false);
      }
    })();
  }, [selectedCommit, workspaceId, relativePath, currentContent]);

  if (!isOpen) return null;

  return (
    <div className="git-history-overlay" onClick={onClose}>
      <div className="git-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="git-history-header">
          <h2>
            <span>📜</span> Histórico Git: {relativePath}
          </h2>
          <button className="git-history-close-btn" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        <div className="git-history-body">
          {/* Commits list */}
          <div className="git-history-sidebar">
            {loading && <div className="git-history-empty">Carregando histórico Git...</div>}
            {!loading && commits.length === 0 && (
              <div className="git-history-empty">
                Nenhum commit encontrado para este arquivo ou a pasta não é um repositório Git.
              </div>
            )}
            {commits.map((c) => {
              const isActive = selectedCommit?.hash === c.hash;
              const dateStr = !isNaN(Number(c.date))
                ? new Date(Number(c.date)).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : c.date;

              return (
                <div
                  key={c.hash}
                  className={`git-history-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedCommit(c)}
                >
                  <div className="git-item-summary">{c.summary}</div>
                  <div className="git-item-meta">
                    <span>{c.author}</span>
                    <span className="git-hash-badge">{c.shortHash}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#777" }}>{dateStr}</div>
                </div>
              );
            })}
          </div>

          {/* Diff view */}
          <div className="git-history-diff">
            {selectedCommit && diffResult && (
              <>
                <div className="git-diff-header">
                  <div>
                    <strong>{selectedCommit.shortHash}</strong>: {selectedCommit.summary}
                  </div>
                  <div>
                    <span style={{ color: "#4ec9b0", marginRight: 8 }}>
                      +{diffResult.stats.added}
                    </span>
                    <span style={{ color: "#f14c4c", marginRight: 8 }}>
                      -{diffResult.stats.removed}
                    </span>
                    <button
                      className="history-action-btn"
                      onClick={() => {
                        if (commitContent) void navigator.clipboard.writeText(commitContent);
                      }}
                      title="Copiar conteúdo deste commit"
                    >
                      Copiar Conteúdo
                    </button>
                  </div>
                </div>

                <div className="git-diff-body">
                  {!diffResult.hasDifferences && (
                    <div className="git-history-empty">
                      O arquivo atual é idêntico ao estado registrado neste commit.
                    </div>
                  )}

                  {diffResult.hunks.map((hunk, hIdx) => (
                    <div key={hIdx} className="diff-hunk">
                      <div className="diff-hunk-header">
                        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                      </div>
                      <div className="diff-hunk-content">
                        {hunk.lines.map((line, lIdx) => (
                          <div key={lIdx} className={`diff-line ${line.kind}`}>
                            <span className="diff-line-prefix">
                              {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}
                            </span>
                            <span className="diff-line-content">{line.text || " "}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {loadingDiff && <div className="git-history-empty">Calculando diff do commit...</div>}

            {!selectedCommit && !loading && (
              <div className="git-history-empty">Selecione um commit para ver as alterações.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
