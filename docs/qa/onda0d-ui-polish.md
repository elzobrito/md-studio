# QA Report — Onda 0D: UI Polish Incremental

**Data:** 2026-09-24  
**Responsável:** agent-qa  
**Escopo:** Validação completa e regressão unificada da Onda 0D (MD-UI-002 a MD-UI-011).  
**Status do Portão:** **APROVADO (Gate `onda_0d_ui_polish_complete`)**

---

## 1. Sumário Executivo

A Onda 0D concentrou melhorias incrementais na interface de usuário (UI Shell, autoria Markdown, configurações, split view e exportação), preparando a arquitetura de autoria para a v0.3–v0.5 sem reescrever o editor ou o pipeline de renderização, e respeitando todas as políticas de Path Fencing e Atomic Save.

Todos os 10 blocos de especificação foram implementados e validados por suítes de testes unitários e de integração dedicadas.

---

## 2. Inventário de Entregáveis e Validação

| ID | Título | Arquivos Modificados / Criados | Testes Dedicados | Status |
|---|---|---|---|---|
| **MD-UI-002** | UI Shell — Inventário Estrutural | `docs/architecture/ui-shell-inventory.md` | Análise arquitetural e inventário de chrome | **APROVADO** |
| **MD-UI-003** | Salvar Único | `src/components/MarkdownEditor.tsx` | `tests/editor/singleSave.test.tsx` (4/4 pass) | **APROVADO** |
| **MD-UI-004** | Menu Exportar Unificado | `src/components/header/ExportMenu.tsx`, `src/styles/export-menu.css`, `src/components/header/AppHeader.tsx` | `tests/header/exportMenu.test.tsx` (6/6 pass) | **APROVADO** |
| **MD-UI-005** | Preview Largura Controlada | `src/state/settings.ts`, `src/hooks/useSettings.ts`, `src/styles/themes.css`, `src/components/settings/PreviewSettings.tsx` | `tests/settings/previewReadingWidth.test.tsx` (5/5 pass) | **APROVADO** |
| **MD-UI-006** | Gutter CodeMirror | `src/components/MarkdownEditor.tsx`, `src/styles/themes.css` | `tests/editor/gutter.test.ts` (2/2 pass) | **APROVADO** |
| **MD-UI-007** | Workspace Rail | `src/components/workspace/WorkspaceRail.tsx`, `src/styles/workspace-rail.css`, `src/App.tsx`, `src/styles/themes.css` | `tests/workspace/workspaceRail.test.tsx` (4/4 pass) | **APROVADO** |
| **MD-UI-008** | Toolbar Markdown Escalável | `src/components/editor/FormattingToolbar.tsx`, `src/styles/formatting-toolbar.css` | `tests/editor/formattingToolbar.test.tsx` (6/6 pass) | **APROVADO** |
| **MD-UI-009** | Novo Documento Iconografia | `src/components/editor/TemplateIcons.tsx`, `src/components/editor/TemplateCard.tsx`, `src/components/editor/NewDocumentModal.tsx`, `src/styles/new-document-modal.css` | `tests/templates/new-document-modal.test.tsx` (6/6 pass) | **APROVADO** |
| **MD-UI-010** | Settings Refinado | `src/components/settings/SettingsPanel.tsx`, `src/styles/settings-panel.css` | `tests/settings/settingsPanel.test.tsx` (6/6 pass) | **APROVADO** |
| **MD-UI-011** | Split View Refinado | `src/components/layout/SplitDivider.tsx`, `src/styles/split-view.css`, `src/App.tsx`, `src/styles/themes.css` | `tests/layout/splitView.test.tsx` (7/7 pass) | **APROVADO** |

---

## 3. Evidência de Testes Automatizados

### 3.1. Vitest (Frontend TypeScript / React)
- **Comando:** `pnpm test`
- **Arquivos testados:** 64/64 suites
- **Testes executados:** 350 aprovados / 0 falhas (100% verde)
- **Tempo de execução:** 25.60s

### 3.2. TypeScript Strict Check
- **Comando:** `pnpm typecheck` (`tsc -b --pretty false`)
- **Erros de tipo:** 0 erros

### 3.3. Cargo Test (Rust / Tauri Backend)
- **Comando:** `cargo test` em `src-tauri`
- **Resultados:** 17 unit tests aprovados / 0 falhas em `md_studio_lib`
- **Status do backend:** íntegro e em conformidade

---

## 4. Conformidade de Acessibilidade e UX
- Todos os elementos interativos possuem semântica ARIA (`role="separator"`, `role="tablist"`, `role="tab"`, `role="tabpanel"`, `role="menu"`).
- Suporte a teclado completo testado e verificado (Arrow keys, Escape, Home, End, Enter, Space).
- Substituição integral de emojis por SVGs vetoriais no Design System (Catppuccin Latte/Mocha).
- Preservação estrita dos contratos de persistência (localStorage, debounce 1500ms, atomic write no Tauri).
