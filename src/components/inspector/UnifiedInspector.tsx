import React, { useState, useMemo } from "react";
import { DocumentOutline } from "../DocumentOutline";
import { OutgoingLinksPanel } from "../wiki/OutgoingLinksPanel";
import { BacklinksPanel } from "../wiki/BacklinksPanel";
import { DocumentInspector } from "./DocumentInspector";
import { WorkspaceHealthPanel } from "../health/WorkspaceHealthPanel";
import { buildDocumentInspection } from "../../services/documentInspector";
import { aggregateWorkspaceHealth } from "../../services/workspaceHealth";
import type { BacklinkResult, ResolvedWikiLink } from "../../types/metadata";
import type { GraphSnapshot } from "../../services/knowledgeGraph";
import { extractOutline } from "../../services/navigation";
import "../../styles/unified-inspector.css";

export interface UnifiedInspectorProps {
  content: string;
  activeDocumentPath?: string;
  onNavigateHeading: (slug: string, line?: number) => void;
  outgoingLinks: ResolvedWikiLink[];
  onOpenOutgoingLink: (path: string) => Promise<void>;
  onUnresolvedWikiTarget?: (target: string) => void;
  backlinkResult: BacklinkResult;
  backlinksLoading?: boolean;
  backlinksError?: string | null;
  onRetryBacklinks?: () => void;
  onOpenBacklinkOccurrence: (path: string, line: number) => Promise<void>;
  snapshot?: GraphSnapshot;
  onNavigateLine?: (line: number) => void;
  onOpenDocument?: (path: string) => void;
  onClose: () => void;
}

export type InspectorSectionId = "toc" | "links" | "backlinks" | "metrics" | "health";

export function UnifiedInspector({
  content,
  activeDocumentPath,
  onNavigateHeading,
  outgoingLinks,
  onOpenOutgoingLink,
  onUnresolvedWikiTarget,
  backlinkResult,
  backlinksLoading = false,
  backlinksError = null,
  onRetryBacklinks = () => {},
  onOpenBacklinkOccurrence,
  snapshot,
  onNavigateLine,
  onOpenDocument,
  onClose,
}: UnifiedInspectorProps) {
  // Track open state for each accordion section
  const [openSections, setOpenSections] = useState<Record<InspectorSectionId, boolean>>({
    toc: true,
    links: true,
    backlinks: true,
    metrics: false,
    health: false,
  });

  const toggleSection = (id: InspectorSectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Derive TOC item count purely from content AST, with zero reliance on Preview DOM
  const outlineItems = useMemo(() => extractOutline(content), [content]);

  // Total backlink occurrences count
  const totalBacklinksCount = useMemo(() => {
    if (!backlinkResult?.groups) return 0;
    return backlinkResult.groups.reduce((acc, g) => acc + g.occurrences.length, 0);
  }, [backlinkResult]);

  // Document Inspection metrics
  const inspection = useMemo(() => {
    if (!activeDocumentPath) return null;
    try {
      return buildDocumentInspection({
        path: activeDocumentPath,
        markdown: content,
        backlinks: backlinkResult?.groups,
      });
    } catch {
      return null;
    }
  }, [activeDocumentPath, content, backlinkResult]);

  // Workspace health aggregation
  const healthReport = useMemo(() => {
    try {
      return aggregateWorkspaceHealth({
        graphSnapshot: snapshot,
      });
    } catch {
      return null;
    }
  }, [snapshot]);

  return (
    <aside
      className="unified-inspector"
      role="complementary"
      aria-label="Inspetor do Documento"
    >
      {/* Header with Title & Close button */}
      <div className="unified-inspector-header">
        <div className="unified-inspector-title">
          <span>📑</span>
          <span>Inspetor do Documento</span>
        </div>
        <div className="unified-inspector-actions">
          <button
            type="button"
            className="inspector-icon-btn"
            onClick={onClose}
            title="Recolher inspetor (Ctrl+J)"
            aria-label="Fechar painel inspetor"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Accordion Sections Container */}
      <div className="unified-inspector-scroll">
        {/* 1. Sumário (TOC) - 100% decoupling from Preview DOM */}
        <div className="inspector-accordion-section">
          <button
            type="button"
            className="inspector-accordion-header"
            onClick={() => toggleSection("toc")}
            aria-expanded={openSections.toc}
            aria-controls="inspector-section-toc"
          >
            <div className="inspector-section-title-group">
              <span>📑</span>
              <span>Sumário</span>
              <span className="inspector-badge-count">{outlineItems.length}</span>
            </div>
            <span className={`inspector-chevron ${openSections.toc ? "open" : ""}`}>▶</span>
          </button>
          {openSections.toc && (
            <div id="inspector-section-toc" className="inspector-accordion-body">
              <DocumentOutline content={content} onNavigate={onNavigateHeading} />
            </div>
          )}
        </div>

        {/* 2. Links citados */}
        <div className="inspector-accordion-section">
          <button
            type="button"
            className="inspector-accordion-header"
            onClick={() => toggleSection("links")}
            aria-expanded={openSections.links}
            aria-controls="inspector-section-links"
          >
            <div className="inspector-section-title-group">
              <span>🔗</span>
              <span>Links citados</span>
              <span className="inspector-badge-count">{outgoingLinks.length}</span>
            </div>
            <span className={`inspector-chevron ${openSections.links ? "open" : ""}`}>▶</span>
          </button>
          {openSections.links && (
            <div id="inspector-section-links" className="inspector-accordion-body">
              <OutgoingLinksPanel
                links={outgoingLinks}
                onOpen={onOpenOutgoingLink}
                onUnresolved={onUnresolvedWikiTarget ?? (() => {})}
              />
            </div>
          )}
        </div>

        {/* 3. Backlinks */}
        <div className="inspector-accordion-section">
          <button
            type="button"
            className="inspector-accordion-header"
            onClick={() => toggleSection("backlinks")}
            aria-expanded={openSections.backlinks}
            aria-controls="inspector-section-backlinks"
          >
            <div className="inspector-section-title-group">
              <span>🔙</span>
              <span>Backlinks</span>
              <span className="inspector-badge-count">{totalBacklinksCount}</span>
            </div>
            <span className={`inspector-chevron ${openSections.backlinks ? "open" : ""}`}>▶</span>
          </button>
          {openSections.backlinks && (
            <div id="inspector-section-backlinks" className="inspector-accordion-body">
              <BacklinksPanel
                result={backlinkResult}
                loading={backlinksLoading}
                error={backlinksError}
                onRetry={onRetryBacklinks}
                onOpenOccurrence={onOpenBacklinkOccurrence}
              />
            </div>
          )}
        </div>

        {/* 4. Métricas & Estrutura (DocumentInspector) */}
        <div className="inspector-accordion-section">
          <button
            type="button"
            className="inspector-accordion-header"
            onClick={() => toggleSection("metrics")}
            aria-expanded={openSections.metrics}
            aria-controls="inspector-section-metrics"
          >
            <div className="inspector-section-title-group">
              <span>🔬</span>
              <span>Métricas & Estrutura</span>
            </div>
            <span className={`inspector-chevron ${openSections.metrics ? "open" : ""}`}>▶</span>
          </button>
          {openSections.metrics && (
            <div id="inspector-section-metrics" className="inspector-accordion-body">
              {inspection ? (
                <DocumentInspector
                  inspection={inspection}
                  onNavigateLine={onNavigateLine}
                  onOpenRelative={onOpenDocument}
                />
              ) : (
                <div className="inspector-empty-state">
                  Abra um documento para inspecionar métricas e estatísticas.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Saúde do Workspace (WorkspaceHealthPanel) */}
        {snapshot && (
          <div className="inspector-accordion-section">
            <button
              type="button"
              className="inspector-accordion-header"
              onClick={() => toggleSection("health")}
              aria-expanded={openSections.health}
              aria-controls="inspector-section-health"
            >
              <div className="inspector-section-title-group">
                <span>🩺</span>
                <span>Saúde do Workspace</span>
              </div>
              <span className={`inspector-chevron ${openSections.health ? "open" : ""}`}>▶</span>
            </button>
            {openSections.health && (
              <div id="inspector-section-health" className="inspector-accordion-body">
                {healthReport ? (
                  <WorkspaceHealthPanel
                    report={healthReport}
                    onNavigate={(path, line) => {
                      if (path) onOpenDocument?.(path);
                      if (line) onNavigateLine?.(line);
                    }}
                  />
                ) : (
                  <div className="inspector-empty-state">
                    Aguardando análise de integridade do workspace.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
