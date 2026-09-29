# Architecture Specification: DocumentTabs & DocumentBar (053-L)

## 1. Context & Objectives

In accordance with normative sections 104–122 and Task 053-L of **053-nova-gui-R3.md**:
1. **Lightweight Visual Projection:** Tabs (`DocumentTabs`) represent open documents managed by `OpenDocumentsRuntime`. Content, CodeMirror `EditorState`, operation generations, and caches remain in the document runtime layer.
2. **Duplicate Prevention:** Opening an already open path focuses the existing tab rather than creating duplicate instances.
3. **Dirty State Integrity:** Dirty indicator badge (`.doc-tab-dirty-badge`) strictly mirrors `contentIdentity !== persistedContentIdentity`. Undo-to-clean naturally clears the badge.
4. **Save Guard on Close:** Closing a dirty tab invokes the unsaved confirmation guard, preventing data loss.
5. **Contextual DocumentBar:** Concentrates document-specific toolbar controls (`ViewModeToggle`, `SaveButton`, `ExportMenu`, presentation trigger) directly above the editor and preview surfaces, completely separating document controls from window chrome.

## 2. Component Design

### `DocumentTabs` (`src/components/tabs/DocumentTabs.tsx`)
- Container: `.document-tabs-wrapper` with horizontal scrollable track (`role="tablist"`).
- Tab Items:
  - Role: `role="tab"`, with `aria-selected` and `tabIndex`.
  - Content: Document icon (`FileTextIcon`), truncated display name, dirty dot badge, and close button (`CloseIcon`).
  - New tab button (`PlusIcon`).
  - Keyboard navigation: `ArrowRight` (next tab), `ArrowLeft` (previous tab), `Home` (first tab), `End` (last tab).

### `DocumentBar` (`src/components/tabs/DocumentBar.tsx`)
- Renders at the top of the central surface:
  - Left: `DocumentTabs`.
  - Right: `ViewModeToggle` (Markdown / Formatado / Dividida), `SaveButton` (with save status reflection), `ExportMenu` (HTML, PDF, EPUB), and presentation mode trigger.

## 3. Styling (`src/styles/document-tabs.css`)
- Conforms to `--docbar-height: 36px`.
- Active tab styling with high-contrast indicator and background elevation.
- Clean scrollbar hiding for sleek desktop presentation.

## 4. Verification

- Vitest suite `tests/runtime/document-tabs-bar.test.ts` (3 tests) validates:
  - Tab rendering, ARIA attributes, active tab selection, and dirty badge.
  - Tab close button accessible label.
  - DocumentBar integration with view mode and save actions.
- Full runtime suite: 62/62 tests passing.
