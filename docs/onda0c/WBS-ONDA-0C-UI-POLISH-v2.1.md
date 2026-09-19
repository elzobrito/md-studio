# WBS-ONDA-0C-UI-POLISH v2.1

## MD Studio — UI Polish (delta sobre o repo pós-0B)

Versão: **2.1** (corrige 2.0)
Status: PRONTA PARA ESAA
Base: diagnóstico UX + wireframes + **estado real do tree em 2026-09-19**
Pré-requisito: Onda 0B **done** + splash **done**

---

## 0. Estado atual do repo (fatos — não aspiração)

| Item | Status |
|------|--------|
| Onda 0B Guided Markdown (`MD-GM-001`…`008`) | **done** |
| Splash boot (`MD-UI-SPLASH-001`) | **done** (`splashscreen.html`, main `visible:false`, `close_splash`, timeout Rust) |
| CI pnpm (`MD-CI-PNPM-001`) | **done** |
| Roadmap | **132/132 done** |
| Commit referência | `d77a8da` |

### O que já existe (não reinventar)

- `src/components/empty/WelcomeScreen.tsx` — ícone 📝, 3 CTAs, hint Ctrl+P, recentes (NÃO tem `?`)
- `src/components/empty/EmptyState.tsx` — workspace sem arquivo já simplificado
- `src/styles/empty-state.css` (não `welcome-screen.css`)
- `src/state/ui.ts` — `rightPanelVisible` + `localStorage` + toggle
- `AppHeader` — toggle sumário `Ctrl+Shift+\` já existe
- Splash nativa Tauri — **fora desta onda** (skip)

### Paths reais (remap vs WBS 2.0)

| 2.0 (errado) | 2.1 (real) |
|--------------|------------|
| `src/styles/welcome-screen.css` | `src/styles/empty-state.css` |
| `src/components/outline/DocumentOutline.tsx` | `src/components/DocumentOutline.tsx` |
| `src/components/ui/Button.tsx` | **criar** em `src/components/ui/Button.tsx` |
| Sidebar ações | `src/components/FileExplorer.tsx` (+ `RecentFiles`, `WorkspaceHeader`) |
| Header | `src/components/header/AppHeader.tsx` |
| Status bar | `src/components/statusbar/StatusBar.tsx` |

---

## 1. Objetivo da onda

Coesão visual: empty state com hierarquia correta, painel direito fechável de verdade (UX), sidebar ações>recentes, header sem título duplicado, botões no mesmo sistema. **Sem** reimplementar splash.

Done = X com evidência Y:
- Empty: Abrir pasta = primary; sem regressão 0B
- Painel: × fecha; `[sumário]` reabre; persistência; editor expande
- Sidebar: pesos claros; Button compartilhado
- Header: sem `<strong>MD Studio</strong>` interno; title nativo dinâmico
- Buttons: auditoria + migração hotspots
- QA: vitest 0B verde + checklist manual

---

## 2. Escopo agregado (6 tasks ESAA — não 33)

| ID | Fase | Depende | Verify |
|----|------|---------|--------|
| `MD-UI-EMPTY-001` | 1 | — | `empty_state_polish_pass` |
| `MD-UI-PANEL-001` | 1 | — | `collapsible_panel_pass` |
| `MD-UI-SIDEBAR-001` | 1 | — | `sidebar_hierarchy_pass` |
| `MD-UI-HEADER-001` | 2 | SIDEBAR (Button) | `top_bar_polish_pass` |
| `MD-UI-BUTTONS-001` | 2 | SIDEBAR | `design_system_pass` |
| `MD-UI-QA-001` | 3 | EMPTY,PANEL,SIDEBAR,HEADER,BUTTONS | `onda_0c_ui_polish_complete` |

**Skip / already done:** splash (`MD-UI-SPLASH-001`), micro-anim status bar (backlog 0C.1).

Ordem de execução: EMPTY → PANEL → SIDEBAR → HEADER → BUTTONS → QA  
(EMPTY/PANEL/SIDEBAR podem em paralelo se agentes distintos.)

---

## 3. Fora de escopo

- Reimplementar splash / mudar timeout boot
- Onda 1 Knowledge / wiki links
- Micro-feedback pulse na status bar (0C.1)
- Redesign completo do WelcomeScreen (só delta de hierarquia)
- Reescrever `ui.ts` store (já existe)

---

## 4. Critério de encerramento

```
[ ] Empty: 3 CTAs com primary=Abrir pasta; sem ícone ?
[ ] Painel direito colapsável com × + reopen status bar + persistência
[ ] Sidebar: ações > recentes; Button system
[ ] Header sem título interno duplicado; window title dinâmico
[ ] Hotspots de botão migrados / auditados
[ ] Regressão 0B + splash + open-file-from-OS OK
[ ] vitest: 0 falhas na suíte relevante
```

Verify final: `onda_0c_ui_polish_complete`
