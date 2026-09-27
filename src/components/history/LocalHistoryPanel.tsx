import React, { useState, useEffect, useRef, useCallback } from "react";
import { ipc } from "../../lib/ipc/client";
import type { HistoryEntry, HistorySnapshot } from "../../contracts/types";
import {
  computeLineDiff,
  formatBytes,
  formatHistoryReason,
  type HistoryDiffResult,
} from "../../services/historyDiff";
import "../../styles/local-history.css";

export interface LocalHistoryPanelProps {
  workspaceId: string;
  relativePath: string;
  currentContent: string;
  currentHash: string;
  isDirty: boolean;
  onRestored?: (newContent: string, newHash: string) => void;
  onClose?: () => void;
}

export const LocalHistoryPanel: React.FC<LocalHistoryPanelProps> = ({
  workspaceId,
  relativePath,
  currentContent,
  currentHash,
  isDirty,
  onRestored,
  onClose,
}) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<HistorySnapshot | null>(null);
  const [diffResult, setDiffResult] = useState<HistoryDiffResult | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Stale diff generation guard: evita race condition se usuário clicar rápido em outra versão
  const diffGenerationRef = useRef(0);

  const loadEntries = useCallback(async () => {
    if (!workspaceId || !relativePath) return;
    setLoading(true);
    try {
      const list = await ipc.listHistoryEntries(workspaceId, relativePath);
      setEntries(list);
      if (list.length > 0 && !selectedHash) {
        setSelectedHash(list[0].hash);
      }
    } catch (err) {
      console.error("Failed to load local history entries:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, relativePath, selectedHash]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // Carregar conteúdo do snapshot selecionado e calcular diff
  useEffect(() => {
    if (!workspaceId || !relativePath || !selectedHash) {
      setSelectedSnapshot(null);
      setDiffResult(null);
      return;
    }

    const currentGen = ++diffGenerationRef.current;
    setLoadingDiff(true);

    void (async () => {
      try {
        const snap = await ipc.getHistorySnapshot(workspaceId, relativePath, selectedHash);
        if (currentGen !== diffGenerationRef.current) return; // Stale check

        setSelectedSnapshot(snap);
        const diff = computeLineDiff(snap.content, currentContent);
        setDiffResult(diff);
      } catch (err) {
        if (currentGen === diffGenerationRef.current) {
          console.error("Failed to fetch historical snapshot:", err);
          setSelectedSnapshot(null);
          setDiffResult(null);
        }
      } finally {
        if (currentGen === diffGenerationRef.current) {
          setLoadingDiff(false);
        }
      }
    })();
  }, [workspaceId, relativePath, selectedHash, currentContent]);

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
  };

  const handleCopyHunk = (hunkLines: typeof diffResult extends null ? never : HistoryDiffResult["hunks"][0]["lines"]) => {
    const text = hunkLines
      .filter((l) => l.kind !== "added")
      .map((l) => l.text)
      .join("\n");
    void handleCopyText(text);
  };

  const handleConfirmRestore = async () => {
    if (!selectedSnapshot || !selectedHash || isDirty) return;
    setRestoring(true);
    setRestoreError(null);

    try {
      const restored = await ipc.restoreHistoryEntry(
        workspaceId,
        relativePath,
        selectedHash,
        currentHash,
      );
      setShowConfirmRestore(false);
      onRestored?.(restored.content, restored.contentHash);
      void loadEntries();
    } catch (err: unknown) {
      setRestoreError((err as Error)?.message || "Falha ao restaurar versão");
    } finally {
      setRestoring(false);
    }
  };

  const isCurrentVersion = selectedHash === currentHash;

  return (
    <div className="local-history-panel">
      <div className="local-history-header">
        <h3 className="local-history-title">
          <span>🕒</span> Histórico Local (Time Machine)
        </h3>
        <div>
          <button
            className="local-history-refresh-btn"
            title="Atualizar lista"
            onClick={() => void loadEntries()}
          >
            ↻
          </button>
          {onClose && (
            <button className="local-history-refresh-btn" title="Fechar" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="local-history-content">
        {/* Timeline Sidebar */}
        <div className="local-history-timeline">
          {loading && entries.length === 0 && (
            <div className="local-history-empty">Carregando histórico...</div>
          )}

          {!loading && entries.length === 0 && (
            <div className="local-history-empty">
              Ainda não há versões anteriores deste documento.
            </div>
          )}

          {entries.map((entry) => {
            const isActive = entry.hash === selectedHash;
            const dateStr = new Date(entry.timestamp).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={`${entry.hash}-${entry.timestamp}`}
                className={`local-history-entry-item ${isActive ? "active" : ""}`}
                onClick={() => setSelectedHash(entry.hash)}
              >
                <div className="entry-item-time">{dateStr}</div>
                <div className="entry-item-reason">{formatHistoryReason(entry.reason)}</div>
                <div className="entry-item-meta">
                  <span>{formatBytes(entry.size)}</span>
                  <span>{entry.hash.slice(0, 7)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Diff View */}
        <div className="local-history-diff-view">
          {selectedSnapshot && diffResult && (
            <>
              <div className="local-history-diff-toolbar">
                <div className="diff-toolbar-info">
                  <span className="diff-stat-add">+{diffResult.stats.added}</span>
                  <span className="diff-stat-remove">-{diffResult.stats.removed}</span>
                  <span>{diffResult.stats.unchanged} linhas inalteradas</span>
                </div>

                <div className="diff-toolbar-actions">
                  <button
                    className="history-action-btn"
                    title="Copiar todo o conteúdo desta versão"
                    onClick={() => void handleCopyText(selectedSnapshot.content)}
                  >
                    Copiar Versão
                  </button>

                  <button
                    className="history-restore-btn"
                    disabled={isDirty || isCurrentVersion || restoring}
                    title={
                      isDirty
                        ? "Salve ou descarte as alterações atuais antes de restaurar uma versão."
                        : isCurrentVersion
                        ? "Esta já é a versão atual."
                        : "Restaurar documento para esta versão anterior"
                    }
                    onClick={() => setShowConfirmRestore(true)}
                  >
                    {isCurrentVersion ? "Versão Atual" : "Restaurar esta versão"}
                  </button>
                </div>
              </div>

              {isDirty && (
                <div style={{ padding: "6px 12px", background: "#332200", color: "#ffd066", fontSize: 11 }}>
                  ⚠️ O documento possui alterações não salvas. Salve ou descarte antes de restaurar.
                </div>
              )}

              <div className="local-history-diff-body">
                {!diffResult.hasDifferences && (
                  <div className="local-history-empty">
                    Esta versão possui o mesmo conteúdo da versão atual.
                  </div>
                )}

                {diffResult.hunks.map((hunk, hIdx) => (
                  <div key={hIdx} className="diff-hunk">
                    <div className="diff-hunk-header">
                      <span>
                        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                      </span>
                      <button
                        className="diff-copy-hunk-btn"
                        onClick={() => handleCopyHunk(hunk.lines)}
                        title="Copiar trecho original"
                      >
                        Copiar trecho
                      </button>
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

          {loadingDiff && (
            <div className="local-history-empty">Calculando diferenças...</div>
          )}

          {!selectedSnapshot && !loadingDiff && entries.length > 0 && (
            <div className="local-history-empty">Selecione uma versão na timeline para comparar.</div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmRestore && (
        <div className="restore-confirm-dialog-overlay" onClick={() => setShowConfirmRestore(false)}>
          <div className="restore-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h4 className="restore-confirm-title">Restaurar versão anterior?</h4>
            <p className="restore-confirm-text">
              A versão atual será preservada com segurança no histórico local (guard snapshot)
              antes da restauração ser aplicada no disco.
            </p>
            {restoreError && (
              <div style={{ color: "#ff6666", fontSize: 12 }}>{restoreError}</div>
            )}
            <div className="restore-confirm-actions">
              <button
                className="history-action-btn"
                disabled={restoring}
                onClick={() => setShowConfirmRestore(false)}
              >
                Cancelar
              </button>
              <button
                className="history-restore-btn"
                disabled={restoring}
                onClick={() => void handleConfirmRestore()}
              >
                {restoring ? "Restaurando..." : "Confirmar e Restaurar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
