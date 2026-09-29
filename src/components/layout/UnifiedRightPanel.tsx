import React, { useState, useMemo } from "react";
import { DocumentOutline } from "../DocumentOutline";
import { OutgoingLinksPanel } from "../wiki/OutgoingLinksPanel";
import { BacklinksPanel } from "../wiki/BacklinksPanel";
import { Settings } from "../Settings";
import { DocumentInspector } from "../inspector/DocumentInspector";
import { UnifiedInspector } from "../inspector/UnifiedInspector";
import { WorkspaceHealthPanel } from "../health/WorkspaceHealthPanel";
import { buildDocumentInspection } from "../../services/documentInspector";
import { aggregateWorkspaceHealth } from "../../services/workspaceHealth";
import type { SessionApi } from "../../state/session";
import type { BacklinkResult, ResolvedWikiLink } from "../../types/metadata";
import type { GraphSnapshot } from "../../services/knowledgeGraph";
import "../../styles/unified-right-panel.css";

export type UnifiedTabId = "outline" | "links" | "backlinks" | "inspector" | "health" | "settings" | "accordion";

export interface UnifiedRightPanelProps {
  content: string;
  onNavigateHeading: (slug: string, line?: number) => void;
  outgoingLinks: ResolvedWikiLink[];
  onOpenOutgoingLink: (path: string) => Promise<void>;
  onUnresolvedWikiTarget: (target: string) => void;
  backlinkResult: BacklinkResult;
  backlinksLoading: boolean;
  backlinksError?: string | null;
  onRetryBacklinks: () => void;
  onOpenBacklinkOccurrence: (path: string, line: number) => Promise<void>;
  session: SessionApi;
  onClose: () => void;
  diagnostics?: string[];
  activeDocumentPath?: string;
  snapshot?: GraphSnapshot;
  onNavigateLine?: (line: number) => void;
  onOpenDocument?: (path: string) => void;
  initialTab?: UnifiedTabId;
}

export const UnifiedRightPanel: React.FC<UnifiedRightPanelProps> = ({
  content,
  onNavigateHeading,
  outgoingLinks,
  onOpenOutgoingLink,
  onUnresolvedWikiTarget,
  backlinkResult,
  backlinksLoading,
  backlinksError,
  onRetryBacklinks,
  onOpenBacklinkOccurrence,
  session,
  onClose,
  diagnostics = [],
  activeDocumentPath,
  snapshot,
  onNavigateLine,
  onOpenDocument,
  initialTab = "outline",
}) => {
  const [activeTab, setActiveTab] = useState<UnifiedTabId>(initialTab);

  // Lazy-mount track: once a heavy tab is opened, keep it mounted to preserve transient UI state
  const [mountedTabs, setMountedTabs] = useState<Set<UnifiedTabId>>(() => new Set([initialTab]));

  const handleSelectTab = (tab: UnifiedTabId) => {
    setActiveTab(tab);
    setMountedTabs((prev) => new Set([...prev, tab]));
  };

  const isAccordion = activeTab === "accordion";

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
    <div className="unified-right-panel" data-testid="unified-right-panel">
      {/* Navigation Tabs Header */}
      <nav className="unified-panel-nav" aria-label="Abas do painel lateral">
        <button
          type="button"
          className={`unified-tab-btn ${activeTab === "outline" ? "active" : ""}`}
          onClick={() => handleSelectTab("outline")}
          title="Sumário de cabeçalhos"
          aria-selected={activeTab === "outline"}
        >
          <span aria-hidden="true">📑</span> Sumário
        </button>
        <button
          type="button"
          className={`unified-tab-btn ${activeTab === "links" ? "active" : ""}`}
          onClick={() => handleSelectTab("links")}
          title="Links que saem deste documento"
          aria-selected={activeTab === "links"}
        >
          <span aria-hidden="true">🔗</span> Links
        </button>
        <button
          type="button"
          className={`unified-tab-btn ${activeTab === "backlinks" ? "active" : ""}`}
          onClick={() => handleSelectTab("backlinks")}
          title="Documentos que apontam para cá"
          aria-selected={activeTab === "backlinks"}
        >
          <span aria-hidden="true">🔙</span> Backlinks
        </button>
        <button
          type="button"
          className={`unified-tab-btn ${activeTab === "inspector" ? "active" : ""}`}
          onClick={() => handleSelectTab("inspector")}
          title="Inspetor 360° do documento"
          aria-selected={activeTab === "inspector"}
        >
          <span aria-hidden="true">🔬</span> Inspector
        </button>
        <button
          type="button"
          className={`unified-tab-btn ${activeTab === "health" ? "active" : ""}`}
          onClick={() => handleSelectTab("health")}
          title="Saúde e integridade do workspace"
          aria-selected={activeTab === "health"}
        >
          <span aria-hidden="true">🩺</span> Health
        </button>
        <button
          type="button"
          className={`unified-tab-btn ${activeTab === "accordion" ? "active" : ""}`}
          onClick={() => handleSelectTab("accordion")}
          title="Visualização unificada em acordeão"
          aria-selected={activeTab === "accordion"}
        >
          <span aria-hidden="true">📜</span> Todos
        </button>

        <button
          type="button"
          className="unified-tab-close-btn"
          onClick={onClose}
          title="Fechar painel (Ctrl+J)"
          aria-label="Fechar painel lateral"
        >
          ×
        </button>
      </nav>

      {/* Panel Body */}
      <div className={`unified-panel-body ${isAccordion ? "accordion-mode" : ""}`}>
        {isAccordion ? (
          <UnifiedInspector
            content={content}
            activeDocumentPath={activeDocumentPath}
            onNavigateHeading={onNavigateHeading}
            outgoingLinks={outgoingLinks}
            onOpenOutgoingLink={onOpenOutgoingLink}
            onUnresolvedWikiTarget={onUnresolvedWikiTarget}
            backlinkResult={backlinkResult}
            backlinksLoading={backlinksLoading}
            backlinksError={backlinksError}
            onRetryBacklinks={onRetryBacklinks}
            onOpenBacklinkOccurrence={onOpenBacklinkOccurrence}
            snapshot={snapshot}
            onNavigateLine={onNavigateLine}
            onOpenDocument={onOpenDocument}
            onClose={onClose}
          />
        ) : (
          <>
            {/* Sumário */}
            {activeTab === "outline" && (
              <DocumentOutline
                content={content}
                onNavigate={onNavigateHeading}
                onClose={onClose}
              />
            )}

            {/* Links */}
            {activeTab === "links" && (
              <OutgoingLinksPanel
                links={outgoingLinks}
                onOpen={onOpenOutgoingLink}
                onUnresolved={onUnresolvedWikiTarget}
              />
            )}

            {/* Backlinks */}
            {activeTab === "backlinks" && (
              <BacklinksPanel
                result={backlinkResult}
                loading={backlinksLoading}
                error={backlinksError}
                onRetry={onRetryBacklinks}
                onOpenOccurrence={onOpenBacklinkOccurrence}
              />
            )}

            {/* Document Inspector (Lazy Mounted) */}
            {(activeTab === "inspector" || mountedTabs.has("inspector")) && (
              <div style={{ display: activeTab === "inspector" ? "block" : "none" }}>
                {inspection ? (
                  <DocumentInspector
                    inspection={inspection}
                    onNavigateLine={onNavigateLine}
                    onOpenRelative={onOpenDocument}
                  />
                ) : (
                  <div style={{ padding: 16, color: "#888", fontSize: 12 }}>
                    Inspetor aguardando abertura de documento no workspace.
                  </div>
                )}
              </div>
            )}

            {/* Workspace Health (Lazy Mounted) */}
            {(activeTab === "health" || mountedTabs.has("health")) && (
              <div style={{ display: activeTab === "health" ? "block" : "none" }}>
                {healthReport ? (
                  <WorkspaceHealthPanel
                    report={healthReport}
                    onNavigate={(path, line) => {
                      if (path) onOpenDocument?.(path);
                      if (line) onNavigateLine?.(line);
                    }}
                  />
                ) : (
                  <div style={{ padding: 16, color: "#888", fontSize: 12 }}>
                    Aguardando análise de integridade do workspace.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
