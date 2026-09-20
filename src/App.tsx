import { useCallback, useEffect, useMemo, useState } from "react";
import { FileExplorer } from "./components/FileExplorer";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { DocumentOutline } from "./components/DocumentOutline";
import { Settings } from "./components/Settings";
import { useDocumentState } from "./state/documentState";
import { useSession, type ViewMode } from "./state/session";
import { isTauriRuntime, pickFolder, pickMarkdownFile } from "./lib/ipc";
import { scrollToHeading } from "./services/navigation";
import { WelcomeScreen } from "./components/empty/WelcomeScreen";
import { ConflictDialog } from "./components/ConflictDialog";
import { exportActiveDocumentHtml } from "./services/exportHtml";
import { EmptyState } from "./components/empty/EmptyState";
import { CommandPalette } from "./components/command/CommandPalette";
import { ResizablePanel } from "./components/layout/ResizablePanel";
import { useResizablePanel } from "./hooks/useResizablePanel";
import { PanelControls } from "./components/header/PanelControls";
import { AppHeader } from "./components/header/AppHeader";
import { Breadcrumb } from "./components/header/Breadcrumb";
import { StatusBar } from "./components/statusbar/StatusBar";
import { ShortcutsModal } from "./components/help/ShortcutsModal";
import { GoToLine } from "./components/editor/GoToLine";
import { useKeyboardShortcuts, type Shortcut } from "./hooks/useKeyboardShortcuts";
import { useScrollSync } from "./hooks/useScrollSync";
import { settingsStore } from "./state/settings";
import { useSettings } from "./hooks/useSettings";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { editorStore } from "./state/editor";
import { queueGoToLine } from "./editor/line-highlight";
import { recentFilesStore } from "./state/recent-files";
import { useMetadata } from "./hooks/useMetadata";
import { OutgoingLinksPanel } from "./components/wiki/OutgoingLinksPanel";
import { BacklinksPanel } from "./components/wiki/BacklinksPanel";
import { CreateNoteFromWiki } from "./components/wiki/CreateNoteFromWiki";

const VIEW_OPTIONS: { id: ViewMode; label: string; title: string }[] = [
  { id: "source", label: "Markdown", title: "Ver e editar o código-fonte .md" },
  { id: "preview", label: "Formatado", title: "Ver a versão renderizada" },
  { id: "split", label: "Dividida", title: "Fonte e formatado lado a lado" },
];

export function App() {
  const session = useSession();
  const settings = useSettings();
  const doc = useDocumentState();
  const metadata = useMetadata(doc.relativePath || undefined);

  const [query, setQuery] = useState("");
  const view = useMemo(() => session.viewMode, [session.viewMode]);
  const tauri = isTauriRuntime();
  const [previewRoot, setPreviewRoot] = useState<HTMLElement | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [goToLineOpen, setGoToLineOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [unresolvedWikiTarget, setUnresolvedWikiTarget] = useState<string | null>(null);
  const scrollSync = useScrollSync({ enabled: view === "split" });

  const hasActiveDocument = Boolean(isWriting || doc.relativePath);

  const handleExportHtml = useCallback(async () => {
    if (!hasActiveDocument) return;
    const base = doc.relativePath
      ? (doc.relativePath.split("/").pop() || "export.md").replace(/\.md$/i, ".html")
      : "export.html";
    const result = await exportActiveDocumentHtml(doc.content, base);
    if (!result.ok && !result.cancelled) {
      console.error(result.error ?? "export failed");
    }
  }, [hasActiveDocument, doc.content, doc.relativePath]);

  useEffect(() => {
    // Dismiss Tauri splashscreen once the React UI is mounted
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("close_splash"))
      .catch(() => {});
  }, []);

  const handleOpenFolderFromWelcome = useCallback(async () => {
    const result = await pickFolder();
    if (result.ok) {
      if (result.source === "tauri") {
        await doc.openFolder(result.pathOrLabel);
      } else {
        await doc.onWorkspaceReady();
      }
      setIsWriting(false);
    }
  }, [doc]);

  const handleOpenFileFromWelcome = useCallback(async () => {
    const result = await pickMarkdownFile();
    if (result.ok) {
      if (result.source === "tauri") {
        await doc.openFile(result.pathOrLabel);
      } else {
        await doc.onWorkspaceReady();
        const name = result.pathOrLabel.includes("/")
          ? result.pathOrLabel.split("/").pop()!
          : result.pathOrLabel;
        await doc.openRelative(name === "demo-workspace" ? "README.md" : name);
      }
      setIsWriting(true);
    }
  }, [doc]);

  const cycleRecentFile = useCallback(
    (direction: 1 | -1) => {
      const items = recentFilesStore.getAll();
      if (items.length === 0) return;
      const currentIndex = items.findIndex((f) => f.path === doc.relativePath);
      let targetIndex = 0;
      if (currentIndex === -1) {
        targetIndex = direction === 1 ? 0 : items.length - 1;
      } else {
        targetIndex = (currentIndex + direction + items.length) % items.length;
      }
      const target = items[targetIndex];
      if (target) {
        void doc.openRecent(target.path);
      }
    },
    [doc],
  );

  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        key: "F1",
        action: () => setShortcutsModalOpen((prev) => !prev),
        description: "Ajuda / Atalhos de teclado",
        category: "Interface",
      },
      {
        key: "/",
        ctrl: true,
        action: () => setShortcutsModalOpen((prev) => !prev),
        description: "Atalhos de teclado",
        category: "Interface",
      },
      {
        key: ",",
        ctrl: true,
        action: () => setSettingsOpen(true),
        description: "Configurações",
        category: "Interface",
      },
      {
        key: "1",
        ctrl: true,
        action: () => session.setViewMode("source"),
        description: "Modo Markdown (código-fonte)",
        category: "Visualização",
      },
      {
        key: "2",
        ctrl: true,
        action: () => session.setViewMode("preview"),
        description: "Modo Formatado (preview)",
        category: "Visualização",
      },
      {
        key: "3",
        ctrl: true,
        action: () => session.setViewMode("split"),
        description: "Modo Dividida (split)",
        category: "Visualização",
      },
      {
        key: "s",
        alt: true,
        action: () => scrollSync.toggleSync(),
        description: "Alternar sincronização de scroll",
        category: "Visualização",
      },
      {
        key: "b",
        ctrl: true,
        action: () => session.toggleLeft(),
        description: "Alternar Barra Lateral Esquerda",
        category: "Visualização",
      },
      {
        key: "\\",
        ctrl: true,
        action: () => session.toggleLeft(),
        description: "Alternar Barra Lateral Esquerda",
        category: "Visualização",
      },
      {
        key: "j",
        ctrl: true,
        action: () => session.toggleRight(),
        description: "Alternar Sumário",
        category: "Visualização",
      },
      {
        key: "\\",
        ctrl: true,
        shift: true,
        action: () => session.toggleRight(),
        description: "Alternar Sumário",
        category: "Visualização",
      },
      {
        key: "F11",
        action: () => session.toggleZen(),
        description: "Modo Zen (sem barras)",
        category: "Visualização",
      },
      {
        key: "n",
        ctrl: true,
        action: () => {
          doc.newDocument();
          setIsWriting(true);
        },
        description: "Novo documento",
        category: "Arquivo",
      },
      {
        key: "s",
        ctrl: true,
        action: () => {
          if (hasActiveDocument) {
            void doc.save();
          }
        },
        description: "Salvar documento",
        category: "Arquivo",
      },
      {
        key: "s",
        ctrl: true,
        shift: true,
        action: () => {
          if (hasActiveDocument) {
            void doc.saveAs();
          }
        },
        description: "Salvar como...",
        category: "Arquivo",
      },
      {
        key: "w",
        ctrl: true,
        action: () => {
          doc.closeFile();
          setIsWriting(false);
        },
        description: "Fechar arquivo",
        category: "Arquivo",
      },
      {
        key: "o",
        ctrl: true,
        shift: true,
        action: () => void handleOpenFolderFromWelcome(),
        description: "Abrir pasta",
        category: "Arquivo",
      },
      {
        key: "o",
        ctrl: true,
        action: () => void handleOpenFileFromWelcome(),
        description: "Abrir arquivo",
        category: "Arquivo",
      },
      {
        key: "g",
        ctrl: true,
        action: () => setGoToLineOpen(true),
        description: "Ir para linha",
        category: "Navegação",
      },
      {
        key: "ArrowUp",
        alt: true,
        action: () => cycleRecentFile(-1),
        description: "Arquivo recente anterior",
        category: "Navegação",
      },
      {
        key: "ArrowDown",
        alt: true,
        action: () => cycleRecentFile(1),
        description: "Próximo arquivo recente",
        category: "Navegação",
      },
      {
        key: "Home",
        ctrl: true,
        action: () => editorStore.goToLine(1),
        description: "Início do documento",
        category: "Editor",
      },
      {
        key: "End",
        ctrl: true,
        action: () => editorStore.goToLine(editorStore.getTotalLines()),
        description: "Fim do documento",
        category: "Editor",
      },
      {
        key: "=",
        ctrl: true,
        action: () => settingsStore.zoomIn(),
        description: "Aumentar zoom",
        category: "Interface",
      },
      {
        key: "+",
        ctrl: true,
        action: () => settingsStore.zoomIn(),
        description: "Aumentar zoom",
        category: "Interface",
      },
      {
        key: "-",
        ctrl: true,
        action: () => settingsStore.zoomOut(),
        description: "Diminuir zoom",
        category: "Interface",
      },
      {
        key: "0",
        ctrl: true,
        action: () => settingsStore.resetZoom(),
        description: "Resetar zoom",
        category: "Interface",
      },
    ],
    [
      session,
      doc,
      scrollSync,
      cycleRecentFile,
      handleOpenFileFromWelcome,
      handleOpenFolderFromWelcome,
    ],
  );

  useKeyboardShortcuts(shortcuts);

  const leftPanel = useResizablePanel({
    side: "left",
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 400,
  });

  const rightPanel = useResizablePanel({
    side: "right",
    defaultWidth: 260,
    minWidth: 180,
    maxWidth: 400,
  });

  const onPreviewRoot = useCallback((el: HTMLElement | null) => {
    setPreviewRoot(el);
  }, []);

  const goToHeading = useCallback(
    (slug: string) => {
      const ensurePreview = view === "source";
      if (ensurePreview) session.setViewMode("preview");

      const tryScroll = () => {
        if (scrollToHeading(slug, previewRoot) || scrollToHeading(slug)) return true;
        return false;
      };

      if (!ensurePreview && tryScroll()) return;

      // Wait for mode switch / re-render of preview HTML
      window.setTimeout(() => {
        if (!tryScroll()) {
          window.setTimeout(() => tryScroll(), 200);
        }
      }, 150);
    },
    [view, session, previewRoot],
  );

  const leftCollapsed = !session.leftOpen;
  const rightCollapsed = !session.rightOpen;

  return (
    <>
    <div className={`app theme-${settings.theme}`} role="application" aria-label="MD Studio">
      <AppHeader
        viewMode={view}
        onViewModeChange={session.setViewMode}
        leftOpen={session.leftOpen}
        rightOpen={session.rightOpen}
        onToggleLeft={session.toggleLeft}
        onToggleRight={session.toggleRight}
        onSave={() => {
          if (hasActiveDocument) {
            void doc.save();
          }
        }}
        canSave={hasActiveDocument}
        canExport={hasActiveDocument}
        onExportHtml={() => {
          if (hasActiveDocument) {
            void handleExportHtml();
          }
        }}
        fileName={
          doc.relativePath
            ? doc.relativePath.split("/").pop()
            : isWriting
              ? "sem-titulo.md"
              : undefined
        }
        onNewDocument={() => {
          doc.newDocument();
          setIsWriting(true);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        breadcrumb={
          doc.workspace && doc.relativePath ? (
            <Breadcrumb
              workspaceLabel={doc.workspace.rootLabel}
              relativePath={doc.relativePath}
            />
          ) : isWriting ? (
            <div style={{ padding: "4px 16px", fontSize: "12px", color: "var(--text-secondary)" }}>
              📝 {doc.relativePath || "sem-titulo.md"}
            </div>
          ) : undefined
        }
      />

      <div
        className={[
          "workspace",
          leftCollapsed ? "left-collapsed" : "",
          rightCollapsed ? "right-collapsed" : "",
          leftPanel.isResizing || rightPanel.isResizing ? "is-resizing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--left-width": `${leftPanel.width}px`,
            "--right-width": `${rightPanel.width}px`,
          } as React.CSSProperties
        }
      >
        {leftCollapsed ? (
          <aside className="panel rail left-rail" aria-label="Explorador recolhido">
            <button
              type="button"
              className="rail-btn"
              onClick={() => session.setLeftOpen(true)}
              title="Mostrar explorador de arquivos"
            >
              📁
            </button>
          </aside>
        ) : (
          <ResizablePanel
            side="left"
            width={leftPanel.width}
            onStartResize={leftPanel.startResize}
            isResizing={leftPanel.isResizing}
            aria-label="Workspace"
          >
            <FileExplorer
              workspace={doc.workspace}
              onOpenRelative={(path) => {
                void doc.openRelative(path);
                setIsWriting(true);
              }}
              onOpenRecent={(path) => {
                void doc.openRecent(path);
                setIsWriting(true);
              }}
              onOpenFolder={doc.openFolder}
              onOpenFile={doc.openFile}
              onWorkspaceReady={doc.onWorkspaceReady}
              query={query}
              onQuery={setQuery}
              activePath={doc.relativePath}
            />
          </ResizablePanel>
        )}

        <main className={`center mode-${view}`}>
          {!isWriting && !doc.relativePath ? (
            !doc.workspace ? (
              <WelcomeScreen
                onOpenFolder={() => void handleOpenFolderFromWelcome()}
                onOpenFile={() => void handleOpenFileFromWelcome()}
                onOpenRecent={(path) => {
                  void doc.openRecent(path);
                  setIsWriting(true);
                }}
                onNewDocument={() => {
                  doc.newDocument();
                  setIsWriting(true);
                }}
              />
            ) : (
              <EmptyState
                onQuickSwitch={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true })
                  );
                }}
                onNewDocument={() => {
                  doc.newDocument();
                  setIsWriting(true);
                }}
              />
            )
          ) : (
            <>
              {view !== "preview" && (
                <MarkdownEditor
                  value={doc.content}
                  dirty={doc.dirty}
                  onChange={doc.setContent}
                  onSave={doc.save}
                  onScroller={scrollSync.setEditorScroller}
                  wikiDocuments={metadata.allDocs}
                />
              )}
              {view !== "source" && (
                <MarkdownViewer
                  content={doc.content}
                  relativePath={doc.relativePath}
                  wikiLinks={metadata.resolvedWikiLinks}
                  onOpenRelative={async (path) => {
                    const opened = await doc.openRelative(path);
                    if (opened) setIsWriting(true);
                  }}
                  onUnresolvedWiki={setUnresolvedWikiTarget}
                  onRoot={(el) => {
                    onPreviewRoot(el);
                    scrollSync.setPreviewScroller(el);
                  }}
                />
              )}
            </>
          )}
        </main>

        {rightCollapsed ? (
          <aside className="panel rail right-rail" aria-label="Painel recolhido">
            <button
              type="button"
              className="rail-btn"
              onClick={() => session.setRightOpen(true)}
              title="Mostrar sumário e preferências"
            >
              ☰
            </button>
          </aside>
        ) : (
          <ResizablePanel
            side="right"
            width={rightPanel.width}
            onStartResize={rightPanel.startResize}
            isResizing={rightPanel.isResizing}
            aria-label="Metadados"
          >
            <DocumentOutline content={doc.content} onNavigate={goToHeading} />
            <OutgoingLinksPanel
              links={metadata.resolvedWikiLinks}
              onOpen={async (path) => {
                const opened = await doc.openRelative(path);
                if (opened) setIsWriting(true);
              }}
              onUnresolved={setUnresolvedWikiTarget}
            />
            <BacklinksPanel
              result={metadata.backlinks}
              loading={metadata.loading}
              error={metadata.error}
              onRetry={() => {
                void metadata.reindex();
              }}
              onOpenOccurrence={async (path, line) => {
                const opened = await doc.openRelative(path);
                if (!opened) return;
                setIsWriting(true);
                if (session.viewMode === "preview") {
                  session.setViewMode("split");
                }
                queueGoToLine(line);
                editorStore.goToLine(line);
              }}
            />
            <Settings session={session} />
            <section className="card" aria-label="Diagnósticos">
              <h2>Diagnósticos</h2>
              <ul className="diag-list">
                {doc.diagnostics.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </section>
          </ResizablePanel>
        )}
      </div>
      <StatusBar
        viewMode={view}
        content={doc.content}
        fileName={doc.relativePath ? doc.relativePath.split("/").pop() : undefined}
        syncScroll={scrollSync.syncEnabled}
        onToggleSyncScroll={scrollSync.toggleSync}
        onGoToLine={() => setGoToLineOpen(true)}
      />
      <CommandPalette onOpenFile={(p) => {
        void doc.openRecent(p);
        setIsWriting(true);
      }} />
      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
      <GoToLine
        isOpen={goToLineOpen}
        onClose={() => setGoToLineOpen(false)}
        onNavigate={() => {
          if (view === "preview") session.setViewMode("source");
        }}
      />
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />
      <CreateNoteFromWiki
        target={unresolvedWikiTarget}
        currentPath={doc.relativePath}
        workspaceId={doc.workspace?.id ?? null}
        onCancel={() => setUnresolvedWikiTarget(null)}
        onCreated={async (path) => {
          setUnresolvedWikiTarget(null);
          const opened = await doc.openRelative(path);
          if (opened) setIsWriting(true);
        }}
      />
    </div>
      <ConflictDialog
        open={!!doc.conflictPath}
        relativePath={doc.conflictPath ?? ""}
        onChoose={(c) => { void doc.resolveConflict(c); }}
      />
    </>
  );
}
