# Onda 0C — UI Polish QA Gate Encerramento

**Data:** 2026-09-19  
**Task:** `MD-UI-QA-001`  
**Verify:** `onda_0c_ui_polish_complete`  
**Status:** APROVADO / PASS  

---

## 1. Verificação do Checklist Obrigatório

### Empty State & Welcome Screen (`MD-UI-EMPTY-001`)
- [x] **Hierarquia de CTAs**: `Abrir Pasta` (primary) > `Abrir Arquivo` (secondary) > `Novo Documento` (ghost).
- [x] **Ausência de ícone `?`**: WelcomeScreen utiliza 📝 e EmptyState utiliza 📄.
- [x] **Dica de atalho**: `Ctrl+P` visível tanto no WelcomeScreen quanto no EmptyState.
- [x] **Orquestração de estados no `App.tsx`**:
  - Sem workspace: exibe `WelcomeScreen` (com recentes e CTAs hierarquizados).
  - Workspace aberto sem arquivo selecionado: exibe `EmptyState` ("Selecione um arquivo na árvore", atalho Ctrl+P).
  - Com arquivo selecionado (ou novo documento): exibe o editor Markdown.

### Painel Direito Colapsável (`MD-UI-PANEL-001`)
- [x] **Botão Fechar (`×`)**: Presente no cabeçalho do `DocumentOutline`, com `aria-label="Fechar painel"`, tooltip informativo e fechamento via `uiStore.setRight(false)`.
- [x] **Persistência**: Estado `rightPanelVisible` mantido em `localStorage` (`md-studio.ui-state`) entre inicializações da aplicação.
- [x] **Botão Reabrir na StatusBar**: Botão `[sumário]` aparece na status bar quando o painel direito está recolhido e reabre o painel ao ser clicado.
- [x] **Atalho de teclado**: `Ctrl+Shift+\` continua alternando o painel de forma bidirecional.
- [x] **Transição CSS**: Transição de 180ms ease no resizable panel garantindo expansão fluida do editor.

### Hierarquia da Sidebar & Design System Button (`MD-UI-SIDEBAR-001` & `MD-UI-BUTTONS-001`)
- [x] **Componente `Button` criado**: Implementado em `src/components/ui/Button.tsx` com variantes `primary`, `secondary`, `ghost`, tamanhos `sm` e `md`, suporte a `fullWidth`, `icon` e `disabled`.
- [x] **Estilos e Tokens**: Definido `--radius-btn: 6px` em `src/styles/button.css`, compartilhado e responsivo a temas escuro e claro.
- [x] **Sidebar vazia**: Botão "Abrir pasta" como primary e "Abrir arquivo" como secondary, com mesmo raio de borda e padding.
- [x] **Recentes na Sidebar**: Separador visual delimitado com linha e label uppercase compacta, itens com peso secundário.
- [x] **Remoção de ruído**: Removida mensagem solta "Nenhum workspace aberto." da barra lateral (estado vazio é centralizado).
- [x] **Migração de Hotspots**: Mapeados em `docs/onda0c/design-system-audit.md` e migrados em `WelcomeScreen`, `EmptyState`, `FileExplorer`, `ViewModeToggle`, `SaveButton` e `NewDocumentModal`.

### Header Interno & Título Nativo Dinâmico (`MD-UI-HEADER-001`)
- [x] **Remoção de branding interno**: Removido `<strong>MD Studio</strong>` e marca do cabeçalho da UI.
- [x] **Título da janela dinâmico (OS / Tauri Window)**:
  - Sem arquivo: `MD Studio`
  - Com arquivo: `MD Studio — nome.md`
  - Modificado (dirty): `MD Studio — ● nome.md`
- [x] **Layout Compacto**: Altura reduzida para 38px, alinhamento flex com ações à esquerda (alternar painel + modos de visualização) e à direita (novo documento, configurações, sumário, salvar).

---

## 2. Testes de Regressão

- [x] **Onda 0B Guided Markdown**:
  - Formatting toolbar CM6 (`tests/markdown/formatting.test.ts` - 20 testes).
  - Slash commands (`tests/markdown/slash.test.ts` - 10 testes).
  - Smart paste HTML para Markdown (`tests/editor/smart-paste.test.ts` - 14 testes).
  - Document templates (`tests/templates/templates.test.ts` - 10 testes).
  - Cheatsheet de Markdown (`tests/help/cheatsheet.test.ts` - 4 testes).
  - Markdown hints/tooltips (`tests/editor/hints.test.ts` - 9 testes).
  - Tabela assistida (`tests/editor/table.test.ts` - 7 testes).
  - Suíte de integração da Onda 0B (`tests/guided-markdown/guidedMarkdownIntegration.test.ts` - 16 testes).
- [x] **Onda 1 Knowledge Foundation**:
  - Modelos de metadados, links wiki, tags, indexador (`tests/foundation/metadata.test.ts` - 22 testes).
- [x] **Boot Splash Screen (`MD-UI-SPLASH-001`)**:
  - Janela nativa leve preservada e fechada na montagem do React via `close_splash`.
- [x] **Abertura de arquivos pelo Sistema Operacional & Single Instance**:
  - Preservados os handlers de `first_existing_markdown_path`, `get_launch_path` e `single_instance`.

---

## 3. Resultados de Execução Automatizada

```
✓ tests/foundation/metadata.test.ts (22 tests)
✓ tests/editor/smart-paste.test.ts (14 tests)
✓ tests/markdown/formatting.test.ts (20 tests)
✓ tests/guided-markdown/guidedMarkdownIntegration.test.ts (16 tests)
✓ tests/templates/templates.test.ts (10 tests)
✓ tests/markdown/slash.test.ts (10 tests)
✓ tests/editor/hints.test.ts (9 tests)
✓ tests/editor/table.test.ts (7 tests)
✓ tests/ux/wireframeFidelity.test.ts (7 tests)
✓ tests/ux/recentFiles.test.ts (6 tests)
✓ tests/ux/settingsStore.test.ts (5 tests)
✓ tests/ux/editorStore.test.ts (5 tests)
✓ tests/help/cheatsheet.test.ts (4 tests)
✓ tests/panel/collapsiblePanel.test.tsx (4 tests)
✓ tests/ui/designSystem.test.tsx (4 tests)
✓ tests/empty/emptyState.test.tsx (3 tests)
✓ tests/header/topBar.test.tsx (3 tests)
✓ tests/ui/button.test.tsx (3 tests)
✓ tests/markdown/core/processor.test.ts (3 tests)
✓ tests/markdown/core/navigation.test.ts (3 tests)
✓ tests/security/content/urlPolicy.test.ts (3 tests)
✓ tests/ux/fuzzySearch.test.ts (3 tests)
✓ tests/ux/breadcrumb.test.ts (2 tests)
✓ tests/export/export.test.ts (1 test)
✓ tests/markdown/mermaid/mermaid.test.ts (1 test)
✓ tests/markdown/extensions/frontmatter.test.ts (1 test)
✓ tests/markdown/math/math.test.ts (1 test)
✓ tests/markdown/code/code.test.ts (1 test)

Test Files  28 passed (28)
Tests       171 passed (171)
TypeCheck   0 errors
Rust Tests  32 passed (32)
```

**Resultado Final:** Todos os critérios de aceite da Onda 0C e testes de regressão foram atendidos com sucesso.
