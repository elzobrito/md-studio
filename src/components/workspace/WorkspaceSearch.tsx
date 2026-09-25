import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ipc } from "../../lib/ipc/client";
import type { SearchResult } from "../../contracts/types";
import { commandRegistry } from "../../commands/commandRegistry";

export interface ReplaceOccurrence {
  relativePath: string;
  line: number;
  originalText: string;
  replacedText: string;
  matchStart?: number;
  matchEnd?: number;
}

export type ReplaceFileStatus = "eligible" | "dirty_excluded" | "outside_workspace";

export interface ReplaceFilePlan {
  relativePath: string;
  status: ReplaceFileStatus;
  statusReason?: string;
  occurrences: ReplaceOccurrence[];
}

export interface ReplacePlan {
  query: string;
  replaceText: string;
  isRegex: boolean;
  matchCase: boolean;
  files: ReplaceFilePlan[];
  totalEligibleReplacements: number;
  totalExcludedReplacements: number;
}

/**
 * Validação do path fence: rejeita travessias com '../' ou barras absolutas que
 * escapariam da raiz do workspace.
 */
export function isPathFenced(relativePath: string): boolean {
  if (!relativePath || typeof relativePath !== "string") return false;
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    return false;
  }
  const parts = normalized.split("/");
  let depth = 0;
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      depth--;
      if (depth < 0) return false;
    } else {
      depth++;
    }
  }
  return depth > 0;
}

/**
 * Constrói o plano de substituição para Replace All com checagem estrita de segurança:
 * 1. Arquivos com mudanças não salvas (dirty) são excluídos.
 * 2. Caminhos fora do fence do workspace são bloqueados.
 * 3. Apenas arquivos limpos e dentro do fence tornam-se elegíveis.
 */
export function buildReplacePlan(params: {
  searchResults: SearchResult[];
  query: string;
  replaceText: string;
  isRegex: boolean;
  matchCase: boolean;
  dirtyFiles: Set<string>;
}): ReplacePlan {
  const { searchResults, query, replaceText, isRegex, matchCase, dirtyFiles } = params;
  const fileGroups = new Map<string, SearchResult[]>();

  for (const res of searchResults) {
    const list = fileGroups.get(res.relativePath) || [];
    list.push(res);
    fileGroups.set(res.relativePath, list);
  }

  const files: ReplaceFilePlan[] = [];
  let totalEligibleReplacements = 0;
  let totalExcludedReplacements = 0;

  for (const [relativePath, results] of fileGroups.entries()) {
    let status: ReplaceFileStatus = "eligible";
    let statusReason: string | undefined;

    if (!isPathFenced(relativePath)) {
      status = "outside_workspace";
      statusReason = "Caminho fora do fence do workspace (acesso negado)";
    } else if (dirtyFiles.has(relativePath)) {
      status = "dirty_excluded";
      statusReason = "Arquivo aberto com alterações não salvas (ignorado para segurança)";
    }

    const occurrences: ReplaceOccurrence[] = results.map((r) => {
      let replaced = r.preview;
      if (query) {
        try {
          if (isRegex) {
            const re = new RegExp(query, matchCase ? "g" : "gi");
            replaced = r.preview.replace(re, replaceText);
          } else {
            if (matchCase) {
              replaced = r.preview.split(query).join(replaceText);
            } else {
              const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const re = new RegExp(escaped, "gi");
              replaced = r.preview.replace(re, replaceText);
            }
          }
        } catch {
          replaced = r.preview;
        }
      }
      return {
        relativePath: r.relativePath,
        line: r.line,
        originalText: r.preview,
        replacedText: replaced,
      };
    });

    if (status === "eligible") {
      totalEligibleReplacements += occurrences.length;
    } else {
      totalExcludedReplacements += occurrences.length;
    }

    files.push({
      relativePath,
      status,
      statusReason,
      occurrences,
    });
  }

  return {
    query,
    replaceText,
    isRegex,
    matchCase,
    files,
    totalEligibleReplacements,
    totalExcludedReplacements,
  };
}

/**
 * Executa o Replace All confirmado salvando cada arquivo elegível via atomic_save.
 * Rejeita execução se confirmed for false.
 */
export async function executeReplacePlan(params: {
  plan: ReplacePlan;
  workspaceId: string;
  confirmed: boolean;
  ipcClient?: typeof ipc;
}): Promise<{
  success: boolean;
  modifiedFiles: string[];
  skippedFiles: string[];
  errors: { path: string; error: string }[];
}> {
  const { plan, workspaceId, confirmed, ipcClient = ipc } = params;

  if (!confirmed) {
    return {
      success: false,
      modifiedFiles: [],
      skippedFiles: plan.files.map((f) => f.relativePath),
      errors: [{ path: "*", error: "Replace All cancelado: confirmação obrigatória não concedida" }],
    };
  }

  const modifiedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const errors: { path: string; error: string }[] = [];

  for (const filePlan of plan.files) {
    if (filePlan.status !== "eligible") {
      skippedFiles.push(filePlan.relativePath);
      continue;
    }

    try {
      const snap = await ipcClient.readDocument(workspaceId, filePlan.relativePath);
      let content = snap.content;

      if (plan.isRegex) {
        const re = new RegExp(plan.query, plan.matchCase ? "g" : "gi");
        content = content.replace(re, plan.replaceText);
      } else {
        if (plan.matchCase) {
          content = content.split(plan.query).join(plan.replaceText);
        } else {
          const escaped = plan.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const re = new RegExp(escaped, "gi");
          content = content.replace(re, plan.replaceText);
        }
      }

      const saveRes = await ipcClient.saveDocument({
        workspaceId,
        relativePath: filePlan.relativePath,
        expectedHash: snap.contentHash,
        content,
      });

      if (saveRes.ok) {
        modifiedFiles.push(filePlan.relativePath);
      } else {
        errors.push({
          path: filePlan.relativePath,
          error: `${saveRes.code}: ${saveRes.message}`,
        });
      }
    } catch (err: any) {
      errors.push({
        path: filePlan.relativePath,
        error: String(err?.message || err),
      });
    }
  }

  return {
    success: errors.length === 0,
    modifiedFiles,
    skippedFiles,
    errors,
  };
}

export interface WorkspaceSearchProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToFile?: (relativePath: string, line: number) => void;
  dirtyFiles?: Set<string>;
  ipcClient?: typeof ipc;
}

export function WorkspaceSearch({
  workspaceId,
  isOpen,
  onClose,
  onNavigateToFile,
  dirtyFiles = new Set(),
  ipcClient = ipc,
}: WorkspaceSearchProps) {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [pathFilter, setPathFilter] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmPlan, setShowConfirmPlan] = useState(false);
  const [replacePlan, setReplacePlan] = useState<ReplacePlan | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    modified: number;
    skipped: number;
    errors: number;
  } | null>(null);

  // Executar busca quando query ou filtros mudam
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let alive = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const rawResults = await ipcClient.searchWorkspace(workspaceId, query);
        if (!alive) return;

        let filtered = rawResults;

        // Filtro de case sensitive
        if (matchCase) {
          filtered = filtered.filter((r) => r.preview.includes(query));
        }

        // Filtro de Regex
        if (isRegex) {
          try {
            const re = new RegExp(query, matchCase ? "" : "i");
            filtered = filtered.filter((r) => re.test(r.preview));
          } catch {
            filtered = [];
          }
        }

        // Filtro de caminho
        if (pathFilter.trim()) {
          const filterLower = pathFilter.trim().toLowerCase();
          filtered = filtered.filter((r) =>
            r.relativePath.toLowerCase().includes(filterLower)
          );
        }

        setResults(filtered);
      } catch (err) {
        console.error("Erro na busca de workspace:", err);
        setResults([]);
      } finally {
        if (alive) setIsSearching(false);
      }
    }, 150);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [isOpen, query, matchCase, isRegex, pathFilter, workspaceId, ipcClient]);

  // Teclado (Esc para fechar)
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleOpenReplacePlan = () => {
    const plan = buildReplacePlan({
      searchResults: results,
      query,
      replaceText,
      isRegex,
      matchCase,
      dirtyFiles,
    });
    setReplacePlan(plan);
    setShowConfirmPlan(true);
  };

  const handleConfirmExecuteReplace = async () => {
    if (!replacePlan) return;
    const res = await executeReplacePlan({
      plan: replacePlan,
      workspaceId,
      confirmed: true,
      ipcClient,
    });
    setExecutionResult({
      modified: res.modifiedFiles.length,
      skipped: res.skippedFiles.length,
      errors: res.errors.length,
    });
    setShowConfirmPlan(false);
    // Recarregar busca
    setQuery((prev) => prev);
  };

  if (!isOpen) return null;

  return (
    <div
      className="workspace-search-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "8vh",
        zIndex: 10000,
      }}
    >
      <div
        className="workspace-search-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "680px",
          maxWidth: "94vw",
          background: "#1e1e2e",
          color: "#cdd6f4",
          borderRadius: "8px",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.6)",
          border: "1px solid #313244",
          display: "flex",
          flexDirection: "column",
          maxHeight: "82vh",
        }}
      >
        {/* Cabeçalho de busca */}
        <div style={{ padding: "16px", borderBottom: "1px solid #313244", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "#89b4fa" }}>
              Busca no Workspace (Ctrl+Shift+F)
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setIsReplaceMode((prev) => !prev)}
                style={{
                  background: isReplaceMode ? "#89b4fa" : "#313244",
                  color: isReplaceMode ? "#11111b" : "#cdd6f4",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Substituir
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  color: "#6c7086",
                  border: "none",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              autoFocus
              type="text"
              placeholder="Buscar ocorrências..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                background: "#181825",
                border: "1px solid #45475a",
                borderRadius: "4px",
                padding: "6px 10px",
                color: "#cdd6f4",
                fontSize: "13px",
              }}
            />
            <button
              type="button"
              title="Diferenciar maiúsculas/minúsculas"
              onClick={() => setMatchCase((v) => !v)}
              style={{
                background: matchCase ? "#89b4fa" : "#313244",
                color: matchCase ? "#11111b" : "#cdd6f4",
                border: "none",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Aa
            </button>
            <button
              type="button"
              title="Expressão Regular"
              onClick={() => setIsRegex((v) => !v)}
              style={{
                background: isRegex ? "#89b4fa" : "#313244",
                color: isRegex ? "#11111b" : "#cdd6f4",
                border: "none",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              .*
            </button>
          </div>

          {isReplaceMode && (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Substituir por..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                style={{
                  flex: 1,
                  background: "#181825",
                  border: "1px solid #45475a",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  color: "#cdd6f4",
                  fontSize: "13px",
                }}
              />
              <button
                type="button"
                onClick={handleOpenReplacePlan}
                disabled={results.length === 0}
                style={{
                  background: results.length > 0 ? "#f38ba8" : "#45475a",
                  color: results.length > 0 ? "#11111b" : "#6c7086",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: results.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                Substituir Tudo...
              </button>
            </div>
          )}

          <div>
            <input
              type="text"
              placeholder="Filtrar por caminho (ex: docs, src/)..."
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              style={{
                width: "100%",
                background: "#181825",
                border: "1px solid #313244",
                borderRadius: "4px",
                padding: "4px 8px",
                color: "#a6adc8",
                fontSize: "12px",
              }}
            />
          </div>
        </div>

        {/* Notificação de resultado de replace anterior */}
        {executionResult && (
          <div
            style={{
              padding: "8px 16px",
              background: "#313244",
              borderBottom: "1px solid #45475a",
              fontSize: "12px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              Substituição concluída: {executionResult.modified} arquivos alterados, {executionResult.skipped} ignorados.
            </span>
            <button
              type="button"
              onClick={() => setExecutionResult(null)}
              style={{ background: "transparent", border: "none", color: "#a6adc8", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Lista de Resultados */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          {isSearching && (
            <div style={{ padding: "16px", color: "#6c7086", fontSize: "13px", textAlign: "center" }}>
              Buscando no workspace...
            </div>
          )}

          {!isSearching && query.trim() && results.length === 0 && (
            <div style={{ padding: "16px", color: "#6c7086", fontSize: "13px", textAlign: "center" }}>
              Nenhuma ocorrência encontrada para "{query}".
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "12px", color: "#a6adc8", marginBottom: "4px" }}>
                {results.length} ocorrência(s) encontrada(s):
              </div>
              {results.map((res, idx) => (
                <div
                  key={`${res.relativePath}-${res.line}-${idx}`}
                  onClick={() => {
                    onNavigateToFile?.(res.relativePath, res.line);
                    onClose();
                  }}
                  style={{
                    padding: "8px 12px",
                    background: "#181825",
                    borderRadius: "4px",
                    border: "1px solid #313244",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#89b4fa" }}>
                    <span>{res.relativePath}</span>
                    <span>Linha {res.line}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#cdd6f4",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {res.preview}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Confirmação do Plano de Replace All */}
        {showConfirmPlan && replacePlan && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(17, 17, 27, 0.95)",
              borderRadius: "8px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              zIndex: 10001,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#f38ba8" }}>
              Plano de Confirmação — Replace All
            </div>
            <div style={{ fontSize: "12px", color: "#cdd6f4" }}>
              Substituir "{replacePlan.query}" por "{replacePlan.replaceText}"
            </div>
            <div style={{ fontSize: "12px", color: "#a6adc8" }}>
              Total elegível: <strong>{replacePlan.totalEligibleReplacements}</strong> ocorrência(s) em{" "}
              {replacePlan.files.filter((f) => f.status === "eligible").length} arquivo(s).
              {replacePlan.totalExcludedReplacements > 0 && (
                <span style={{ color: "#f9e2af", marginLeft: "8px" }}>
                  ({replacePlan.totalExcludedReplacements} ignoradas por segurança).
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #313244", borderRadius: "4px", padding: "8px" }}>
              {replacePlan.files.map((filePlan) => (
                <div
                  key={filePlan.relativePath}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderBottom: "1px solid #181825",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ fontFamily: "monospace", color: "#cdd6f4" }}>
                    {filePlan.relativePath} ({filePlan.occurrences.length})
                  </span>
                  {filePlan.status === "eligible" && (
                    <span style={{ background: "#a6e3a1", color: "#11111b", padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>
                      Elegível
                    </span>
                  )}
                  {filePlan.status === "dirty_excluded" && (
                    <span
                      title={filePlan.statusReason}
                      style={{ background: "#f9e2af", color: "#11111b", padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}
                    >
                      Dirty (Ignorado)
                    </span>
                  )}
                  {filePlan.status === "outside_workspace" && (
                    <span
                      title={filePlan.statusReason}
                      style={{ background: "#f38ba8", color: "#11111b", padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}
                    >
                      Fora do Workspace (Bloqueado)
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setShowConfirmPlan(false)}
                style={{
                  background: "#313244",
                  color: "#cdd6f4",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExecuteReplace}
                disabled={replacePlan.totalEligibleReplacements === 0}
                style={{
                  background: replacePlan.totalEligibleReplacements > 0 ? "#a6e3a1" : "#45475a",
                  color: "#11111b",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: replacePlan.totalEligibleReplacements > 0 ? "pointer" : "not-allowed",
                }}
              >
                Confirmar e Gravar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook global que registra o atalho Ctrl+Shift+F e comanda a exibição do WorkspaceSearch.
 */
export function useWorkspaceSearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsOpen((v) => !v);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
