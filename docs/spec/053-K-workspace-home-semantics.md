# Architecture Specification: Workspace Home Semantics (053-K)

## 1. Context & Objectives

In accordance with normative sections 79–87 and Task 053-K of **053-nova-gui-R3.md**:
1. **Local-first Workspace Definition:** A workspace is strictly a local view over an authorized filesystem directory. No proprietary project file (`.workspace`), vault, or database container is created or required.
2. **Normative Action Naming:** Renamed user-facing action from `Abrir Pasta` to `Abrir Workspace` as the primary Call-To-Action (CTA).
3. **No Arbitrary File Auto-Opening:** Explicitly eliminates the legacy behavior where opening a directory automatically opened the first arbitrary `.md` file discovered. Opening a workspace now navigates cleanly to the central `WorkspaceHome` surface.
4. **Preserved Actions:** `Abrir Arquivo` (for ad-hoc editing) and `Novo Documento` (with template selection) remain fully accessible from both the welcome state and the active workspace state.

## 2. Component Design (`src/components/home/WorkspaceHome.tsx`)

The `WorkspaceHome` component serves as the central surface when no document is active (`!doc.relativePath && !isWriting`):
- **When no workspace is open (`workspace === null`):**
  - Renders the local-first welcome header with SVG `MarkdownIcon`.
  - Primary CTA: "Abrir Workspace" (`FolderOpenIcon`).
  - Secondary CTA: "Abrir Arquivo" (`FilePlusIcon`).
  - Tertiary CTA: "Novo Documento" (`EditIcon`).
  - Quick access to `RecentFiles`.
  - Keyboard hint: "Ctrl+P para busca rápida de arquivos • Ctrl+B para barra lateral".
- **When a workspace is open (`workspace !== null`):**
  - Displays the workspace root directory title (`workspace.rootLabel`).
  - Subtitle: "Workspace Ativo • Local-first".
  - Status: "Filesystem conectado e monitorado. Índice de metadados pronto."
  - Contextual actions: "Novo Documento", "Buscar Arquivos (Ctrl+P)", "Trocar Workspace".
  - Recent files within workspace context.

## 3. Runtime Lifecycle Change (`src/state/documentState.ts`)

In `useDocumentState()`, the `openFolder` callback was modified:
- Previously: queried `listEntries(ws.id, "")` and called `openRelative(firstMd.relativePath, ws)` if found.
- Now: sets `relativePath = ""`, `snapshot = null`, `content = ""`, clears dirty state, and transitions status to `ready`.
- Result: Opening a workspace reliably displays `WorkspaceHome` without unintended file mutations or unwanted initial focus.

## 4. Verification

- Vitest suite `tests/runtime/workspace-home-semantics.test.ts` (3 tests) validates:
  - Primary CTA label is "Abrir Workspace" (not "Abrir Pasta").
  - Welcome screen and active workspace screen rendering and actions.
  - Zero-auto-open transition on workspace ready.
- Full runtime suite: 59/59 tests passing.
