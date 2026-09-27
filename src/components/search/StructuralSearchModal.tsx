import React, { useState, useEffect, useRef, useCallback } from "react";
import type { GraphSnapshot } from "../../services/knowledgeGraph";
import {
  executeStructuralQuery,
  STRUCTURAL_SEARCH_PRESETS,
  type StructuralPredicate,
  type PredicateType,
  type StructuralQuery,
  type StructuralSearchResult,
  type MatchedResultItem,
} from "../../services/structuralSearch";
import "../../styles/structural-search.css";

export interface StructuralSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: GraphSnapshot;
  onSelectDocument: (path: string) => void;
}

const PREDICATE_OPTIONS: Array<{ type: PredicateType; label: string; placeholder: string; hasValue: boolean }> = [
  { type: "references_doc", label: "Referenciam documento", placeholder: "Ex: notas/arquitetura", hasValue: true },
  { type: "no_backlinks", label: "Sem backlinks (órfão de entrada)", placeholder: "", hasValue: false },
  { type: "is_orphan", label: "Totalmente isolado (0 in / 0 out)", placeholder: "", hasValue: false },
  { type: "uses_asset", label: "Usam asset", placeholder: "Ex: logo.png", hasValue: true },
  { type: "in_folder", label: "Na pasta", placeholder: "Ex: notas/reunioes", hasValue: true },
  { type: "points_to_heading", label: "Apontam para heading", placeholder: "Ex: introducao", hasValue: true },
  { type: "has_tag", label: "Possui tag", placeholder: "Ex: projeto-x", hasValue: true },
  { type: "has_unresolved_links", label: "Links não resolvidos", placeholder: "", hasValue: false },
];

export const StructuralSearchModal: React.FC<StructuralSearchModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  onSelectDocument,
}) => {
  const [combinator, setCombinator] = useState<"AND" | "OR">("AND");
  const [predicates, setPredicates] = useState<StructuralPredicate[]>([
    { type: "no_backlinks" },
  ]);
  const [results, setResults] = useState<StructuralSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);
  const pageSize = 50;

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleRunSearch = useCallback(
    async (offset = 0) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      try {
        const query: StructuralQuery = {
          combinator,
          predicates,
          offset,
          limit: pageSize,
        };

        const res = await executeStructuralQuery(snapshot, query, controller.signal);
        setResults(res);
        setPageOffset(offset);
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("Structural search failed:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [snapshot, combinator, predicates, pageSize],
  );

  const handleCancelSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void handleRunSearch(0);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  const handleAddPredicate = () => {
    setPredicates((prev) => [...prev, { type: "in_folder", value: "" }]);
  };

  const handleRemovePredicate = (index: number) => {
    setPredicates((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePredicateTypeChange = (index: number, newType: PredicateType) => {
    setPredicates((prev) => {
      const next = [...prev];
      next[index] = { type: newType, value: "" };
      return next;
    });
  };

  const handlePredicateValueChange = (index: number, val: string) => {
    setPredicates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value: val };
      return next;
    });
  };

  const handleApplyPreset = (presetQuery: StructuralQuery) => {
    setCombinator(presetQuery.combinator);
    setPredicates(presetQuery.predicates);
    void handleRunSearch(0);
  };

  if (!isOpen) return null;

  return (
    <div className="structural-search-overlay" onClick={onClose}>
      <div className="structural-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="structural-search-header">
          <h2>
            <span>🔍</span> Busca Estrutural (Knowledge Graph)
          </h2>
          <button className="structural-search-close-btn" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        <div className="structural-search-body">
          {/* Presets */}
          <div className="structural-search-presets">
            <span className="structural-search-presets-label">Presets:</span>
            {STRUCTURAL_SEARCH_PRESETS.map((p) => (
              <button
                key={p.id}
                className="structural-preset-btn"
                title={p.description}
                onClick={() => handleApplyPreset(p.query)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Builder */}
          <div className="structural-query-builder">
            <div className="structural-builder-controls">
              <label>
                Combinador:{" "}
                <select
                  className="structural-combinator-select"
                  value={combinator}
                  onChange={(e) => setCombinator(e.target.value as "AND" | "OR")}
                >
                  <option value="AND">Corresponder a TODOS os filtros (AND)</option>
                  <option value="OR">Corresponder a QUALQUER filtro (OR)</option>
                </select>
              </label>
            </div>

            {predicates.map((pred, idx) => {
              const optionConfig = PREDICATE_OPTIONS.find((o) => o.type === pred.type);
              return (
                <div key={idx} className="structural-predicate-row">
                  <select
                    className="structural-predicate-select"
                    value={pred.type}
                    onChange={(e) => handlePredicateTypeChange(idx, e.target.value as PredicateType)}
                  >
                    {PREDICATE_OPTIONS.map((opt) => (
                      <option key={opt.type} value={opt.type}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {optionConfig?.hasValue ? (
                    <input
                      type="text"
                      className="structural-predicate-input"
                      placeholder={optionConfig.placeholder}
                      value={pred.value || ""}
                      onChange={(e) => handlePredicateValueChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRunSearch(0);
                      }}
                    />
                  ) : (
                    <div style={{ flex: 1 }} />
                  )}

                  <button
                    className="structural-predicate-remove-btn"
                    title="Remover filtro"
                    onClick={() => handleRemovePredicate(idx)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <div className="structural-builder-actions">
              <button className="structural-add-btn" onClick={handleAddPredicate}>
                + Adicionar Filtro
              </button>
              <div>
                {loading ? (
                  <button className="structural-cancel-btn" onClick={handleCancelSearch}>
                    Cancelar
                  </button>
                ) : (
                  <button className="structural-run-btn" onClick={() => handleRunSearch(0)}>
                    Executar Busca
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="structural-results-header">
            <span>
              {results
                ? `Encontrados: ${results.totalCount} documento(s) (${results.executionTimeMs}ms)`
                : "Aguardando busca..."}
            </span>
          </div>

          <div className="structural-results-list">
            {results && results.items.length === 0 && (
              <div className="structural-empty-state">
                Nenhum documento encontrado com os critérios estruturais selecionados.
              </div>
            )}

            {results?.items.map((item: MatchedResultItem) => (
              <div
                key={item.id}
                className="structural-result-card"
                onClick={() => {
                  if (item.path) {
                    onSelectDocument(item.path);
                    onClose();
                  }
                }}
              >
                <div className="structural-card-title">{item.label}</div>
                {item.path && <div className="structural-card-path">{item.path}</div>}
                <div className="structural-card-reasons">
                  {item.matchedReasons.map((r, i) => (
                    <span key={i} className="structural-badge">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {results && results.totalCount > pageSize && (
            <div className="structural-pagination">
              <button
                className="structural-page-btn"
                disabled={pageOffset === 0 || loading}
                onClick={() => handleRunSearch(Math.max(0, pageOffset - pageSize))}
              >
                Anterior
              </button>
              <span>
                Página {Math.floor(pageOffset / pageSize) + 1} de{" "}
                {Math.ceil(results.totalCount / pageSize)}
              </span>
              <button
                className="structural-page-btn"
                disabled={!results.hasMore || loading}
                onClick={() => handleRunSearch(pageOffset + pageSize)}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
