# Architecture Specification: Integrated Workspace Sidebar (053-J)

## 1. Context & Objectives

In accordance with normative sections 88–101 and Task 053-J of **053-nova-gui-R3.md**:
1. **Single Left Sidebar:** Eliminates the separate 48px `WorkspaceRail` icon column and unifies navigation into a single left sidebar (`IntegratedWorkspaceSidebar`).
2. **Preserved Capabilities:** Zero capability loss. The file explorer (`FileExplorer`) and task explorer (`TodoExplorer`) are cleanly hosted as integrated modes/tabs (`Arquivos` | `Tarefas`) within the sidebar.
3. **Workspace Header & Quick Actions:** Provides a clean workspace header (title, tooltip path, collapse toggle) and contextual quick action triggers (Abrir Pasta, Abrir Arquivo).
4. **Path Fencing & Canonical Identity:** Reuses established path fencing invariants, preserving relative path safety and directory hierarchies.

## 2. Component Design (`src/components/workspace/IntegratedWorkspaceSidebar.tsx`)

- **Header Region (`.sidebar-header`):**
  - Displays current workspace label with `FolderIcon`.
  - Collapse button with `CloseIcon` to hide sidebar.
- **Quick Actions Region (`.sidebar-quick-actions`):**
  - Primary button: "Abrir pasta" (`onOpenFolder`).
  - Secondary button: "Abrir arquivo" (`onOpenFile`).
- **Mode Tabs (`.sidebar-tabs`):**
  - "Arquivos": switches to filesystem tree.
  - "Tarefas": switches to TODO explorer with dynamic task count badge.
- **Content Area (`.sidebar-content-area`):**
  - Dynamically renders `FileExplorer` or `TodoExplorer` depending on active tab, with full scrolling and keyboard navigation.

## 3. Layout Integration (`src/App.tsx`)
- Retired the external `WorkspaceRail` component.
- Simplified CSS layout variable `--left-width` to `${leftPanel.width}px` (removing the previous `+ 48px` offset).
- Preserved resizing and collapsing behavior via `useResizablePanel`.

## 4. Verification

- Test suite `tests/runtime/integrated-sidebar.test.ts` (3 tests) verifies:
  - Header branding and action buttons rendering.
  - Tab state switching and ARIA tablist/tab semantics (`aria-selected`).
  - Collapse button callback invocation.
- Full runtime suite: 56/56 tests passing.
