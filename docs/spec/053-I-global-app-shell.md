# Architecture Specification: Global AppShell & GlobalAppBar (053-I)

## 1. Context & Objectives

In accordance with normative sections 71–78 and Task 053-I of **053-nova-gui-R3.md**:
1. **Single Global App Bar:** Consolidates all global window-level interactions at the top (`GlobalAppBar`), strictly separating application chrome from document-specific toolbar controls.
2. **Three-Column Workspace Layout:** Organizes the body into an integrated left sidebar region, a flexible central workspace surface receiving visual priority, and a collapsible right inspector surface.
3. **Stable StatusBar:** Anchors the footer status bar stably at the bottom with fixed layout dimensions (`var(--statusbar-height)`).
4. **Desktop Runtime Safety:** Maintains full compatibility with Linux WebKitGTK startup invariants (`GDK_BACKEND=x11`, `WEBKIT_DISABLE_DMABUF_RENDERER=1`).

## 2. Component Design

### `GlobalAppBar` (`src/components/shell/GlobalAppBar.tsx`)
- **Left Region:**
  - Sidebar toggle button with `SidebarIcon`, reflecting state via `aria-pressed`.
  - Brand & Home group: `[MD]` badge and `MD Studio` title navigating to Home / Welcome without closing workspace.
  - Quick new document trigger (`PlusIcon`).
- **Center Region:**
  - Global Search / Quick Switcher trigger input with `SearchIcon`, descriptive prompt, and `<kbd>Ctrl+P</kbd>` badge.
- **Right Region:**
  - Theme toggle button (`SunIcon` / `MoonIcon` toggling dark/light mode).
  - Settings shortcut button (`SettingsIcon`).
  - Inspector toggle button (`InspectorIcon`, `aria-pressed={inspectorOpen}`).
  - Extensible `extraActions` slot allowing document actions (Save, Export, ViewMode) to be cleanly displayed during the incremental migration until task 053-L activates the dedicated `DocumentBar`.

### `AppShell` (`src/components/shell/AppShell.tsx`)
- Container wrapping the full desktop window:
  - Top: `appBar`
  - Body: `app-workspace-body` (Sidebar | Center Surface | Inspector)
  - Footer: `app-statusbar-container`

## 3. Styling & Tokens (`src/styles/app-shell.css`)
- Relies directly on canonical tokens from `design-tokens.css`:
  - `--appbar-height: 40px`
  - `--statusbar-height: 28px`
  - `--color-surface`, `--color-bg`, `--color-border`, `--color-card`, `--color-hover`, `--color-accent`
- High-contrast visual separation in both light and dark themes.

## 4. Verification

- Vitest suite `tests/runtime/global-app-shell.test.ts` (4 tests) validates:
  - Top header role, branding, and shortcuts.
  - Theme toggle icon parity.
  - 3-column layout structure and CSS class application.
- All 53 runtime tests passing.
