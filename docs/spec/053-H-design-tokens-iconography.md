# Architecture Specification: Design Tokens & Iconography (053-H)

## 1. Context & Objectives

In accordance with **053-nova-gui-R3.md** (Task 053-H) and the approved baseline prototype `v6-final`:
1. **Design Tokens:** Centralize layout dimensions (AppBar, DocumentTabs, DocumentBar, Sidebar, Inspector, StatusBar), hit targets, border radii, typography, z-index hierarchy, and focus visibility rings.
2. **Theme Parity:** Guarantee exact 1:1 color token equivalence between Light mode (`src/styles/themes/light.css`) and Dark mode (`src/styles/themes/dark.css`), ensuring WCAG contrast compliance and crisp boundary separation.
3. **Local Icon Registry:** Provide a complete set of accessible, zero-dependency SVG icon components in `src/components/icons/index.tsx`, eliminating all remote CDNs, font downloads, and chrome emojis.

## 2. Token Architecture

### Layout & Sizing Tokens (`src/styles/design-tokens.css`)
- `--appbar-height: 40px`
- `--tabs-height: 38px`
- `--docbar-height: 36px`
- `--statusbar-height: 28px`
- `--sidebar-min-width: 200px`, `--sidebar-default-width: 260px`, `--sidebar-max-width: 480px`
- `--inspector-min-width: 220px`, `--inspector-default-width: 280px`, `--inspector-max-width: 500px`
- `--hit-target-comfortable: 32px`
- `--resizer-hitbox: 8px`
- Focus ring: `:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 1px; }`

### Color Palette Parity (Light & Dark)
Standard tokens available across both themes:
- Surface hierarchy: `--color-bg`, `--color-surface`, `--color-sidebar`, `--color-card`, `--color-card-inner`
- Border & separation: `--color-border`, `--color-border-subtle`
- Content & typography: `--color-text`, `--color-muted`
- Interaction: `--color-hover`, `--color-active-bg`, `--color-active-border`
- Accents: `--color-accent`, `--color-accent-hover`, `--color-focus`
- Status: `--color-danger`, `--color-warning`, `--color-success`

## 3. Local SVG Icon Registry (`src/components/icons/index.tsx`)

A dedicated React SVG icon system using `stroke="currentColor"` and `strokeWidth="2"`:
- **Shell & Layout:** `SidebarIcon`, `InspectorIcon`, `SplitIcon`, `SplitHorizontalIcon`, `EditIcon`, `PreviewIcon`, `DiffIcon`, `MaximizeIcon`, `MinimizeIcon`, `ColumnsIcon`.
- **Files & Navigation:** `FileIcon`, `FileTextIcon`, `FilePlusIcon`, `FolderIcon`, `FolderOpenIcon`, `FolderPlusIcon`, `MarkdownIcon`, `ChevronRightIcon`, `ChevronDownIcon`, `ChevronLeftIcon`, `ChevronUpIcon`, `CloseIcon`, `PlusIcon`, `TrashIcon`, `SearchIcon`, `RefreshCwIcon`, `ExternalLinkIcon`, `CopyIcon`, `CheckIcon`.
- **UI & Actions:** `SaveIcon`, `SettingsIcon`, `HistoryIcon`, `GitBranchIcon`, `BookmarkIcon`, `SunIcon`, `MoonIcon`, `ZoomInIcon`, `ZoomOutIcon`, `HomeIcon`, `AlertCircleIcon`, `AlertTriangleIcon`, `InfoIcon`.
- **Editor:** `BoldIcon`, `ItalicIcon`, `HeadingIcon`, `ListIcon`, `ListOrderedIcon`, `CodeIcon`, `TableIcon`, `ImageIcon`, `LinkIcon`.

## 4. Verification

Test suite `tests/runtime/design-tokens-icons.test.ts` confirms:
- Sizing and dimension variable definitions in CSS
- Strict color token parity between Light and Dark themes
- Proper `@import` chaining in `themes.css`
- Correct SVG markup rendering, attributes, and accessibility behavior (`aria-hidden="true"` vs explicit `aria-label`).
