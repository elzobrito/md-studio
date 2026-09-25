# Inventário Estrutural e Arquitetura do UI Shell (MD-UI-002)

**Data:** 24 de setembro de 2026  
**Produto:** MD Studio (v0.2.3+)  
**Norma de referência:** `002-ui-shell-simplificado.md` (Onda 0D — UI Polish Incremental)  
**Fonte normativa superior:** `ROADMAP-CANONICO-MD-STUDIO-v0.3-v0.5.md`  
**Escopo:** Mapeamento técnico detalhado do layout, regiões, controles e redundâncias da interface para embasar as tarefas granulares subsequentes.

---

## 1. Visão Geral e Objetivo

A especificação `002-ui-shell-simplificado.md` define que o **UI Shell** deve ser reorganizado de forma incremental para eliminar chrome redundante, recuperar área útil para o documento e fixar três regiões estáveis no produto:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Command / Document Bar (TopBar Consolidada)                     │
├──────────┬───────────────────────────────────────┬──────────────┤
│          │                                       │              │
│ Workspace│              Document                 │  Inspector   │
│   Rail   │        (Editor / Preview / Split)     │   (Right)    │
│          │                                       │              │
├──────────┴───────────────────────────────────────┴──────────────┤
│ Status Bar                                                      │
└─────────────────────────────────────────────────────────────────┘
```

Este inventário cumpre a exigência obrigatória da task `GE4.1 (MD-UI-002)` antes de qualquer alteração física no layout do repositório.

---

## 2. Inventário de Componentes e Estrutura Atual

A montagem da interface parte de [`src/App.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/App.tsx) e ramifica-se nos seguintes subsistemas:

### 2.1 Topo (Header e Navegação)
- **Componente:** [`AppHeader.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/header/AppHeader.tsx) (em `src/components/header/`)
- **Camadas renderizadas:**
  1. `.app-toolbar` (faixa horizontal superior principal):
     - Lado esquerdo: Botão toggle da sidebar esquerda (`≡`) e [`ViewModeToggle.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/header/ViewModeToggle.tsx) (`[Markdown] [Formatado] [Dividida]`).
     - Lado direito: Botão Novo Documento (`➕`), Botão Busca Rápida (`🔍`), Botão Configurações (`⚙`), Botão Alternar Sumário (`≡`), Botão Apresentação (`📽️`), [`SaveButton.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/header/SaveButton.tsx), [`ExportHtmlButton.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/header/ExportHtmlButton.tsx) e [`ExportPdfButton.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/header/ExportPdfButton.tsx).
  2. `.app-header-breadcrumb` (faixa horizontal secundária):
     - Renderiza [`Breadcrumb.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/header/Breadcrumb.tsx) com o caminho relativo do arquivo ativo ou fallback textual com emoji (`📝 sem-titulo.md`).

### 2.2 Região Central e Painéis Laterais (Workspace)
- **Container:** `.workspace` em `src/App.tsx`:
  - **Lado Esquerdo:**
    - Se recolhido (`leftCollapsed`): Renderiza `<aside className="panel rail left-rail">` com botão `📁`.
    - Se aberto: Renderiza [`ResizablePanel`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/layout/ResizablePanel.tsx) contendo [`FileExplorer.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/FileExplorer.tsx) (árvore de arquivos, busca de workspace, abertura de pasta).
  - **Centro (`.center.mode-${view}`):**
    - Se nenhum documento ativo: Renderiza [`WelcomeScreen.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/empty/WelcomeScreen.tsx) ou [`EmptyState.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/empty/EmptyState.tsx).
    - Se documento ativo:
      - Modos `source` e `split`: Renderiza [`MarkdownEditor.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/MarkdownEditor.tsx).
      - Modos `preview` e `split`: Renderiza [`MarkdownViewer.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/MarkdownViewer.tsx).
  - **Lado Direito:**
    - Se recolhido (`rightCollapsed`): Renderiza `<aside className="panel rail right-rail">` com botão `☰`.
    - Se aberto: Renderiza [`ResizablePanel`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/layout/ResizablePanel.tsx) empilhando:
      1. [`DocumentOutline.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/DocumentOutline.tsx) (sumário de cabeçalhos);
      2. [`OutgoingLinksPanel.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/wiki/OutgoingLinksPanel.tsx) (links de saída wiki);
      3. [`BacklinksPanel.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/wiki/BacklinksPanel.tsx) (backlinks de entrada);
      4. [`Settings.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/Settings.tsx) (preferências rápidas);
      5. `section.card` Diagnósticos do documento.

### 2.3 Rodapé (Status Bar)
- **Componente:** [`StatusBar.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/statusbar/StatusBar.tsx)
- **Controles:** Modo de visualização ativo, contagem de palavras/caracteres/linhas, nome do arquivo, botão de sincronização de rolagem (`useScrollSync`) e botão para atalho de Ir para Linha (`GoToLine`).

### 2.4 Modais, Diálogos e Overlays Globais
- [`CommandPalette.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/command/CommandPalette.tsx) (`Ctrl+P`)
- [`ShortcutsModal.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/help/ShortcutsModal.tsx) (`Ctrl+/`)
- [`GoToLine.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/editor/GoToLine.tsx) (`Ctrl+G`)
- [`SettingsPanel.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/settings/SettingsPanel.tsx) (`Ctrl+,`)
- [`NewDocumentModal.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/editor/NewDocumentModal.tsx) (`Ctrl+N`)
- [`PresentationMode.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/presentation/PresentationMode.tsx) (`F5`)
- [`DraftRecoveryDialog.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/DraftRecoveryDialog.tsx)
- [`ConflictDialog.tsx`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/ConflictDialog.tsx)

---

## 3. Diagnóstico de Redundâncias e Problemas Identificados

### 3.1 Duplicação Crítica: Comando e Estado "Salvar"
- **Ocorrência 1:** No topo global ([`AppHeader.tsx#L130`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/header/AppHeader.tsx#L130)), o botão `<SaveButton />` exibe o status de persistência e aciona `onSave`.
- **Ocorrência 2:** No topo do editor CodeMirror ([`MarkdownEditor.tsx#L201-L206`](file:///home/elzobrito/desenvolvimento/md-studio/src/components/MarkdownEditor.tsx#L201-L206)):
  ```tsx
  <header>
    <span>{props.dirty ? "Modificado" : "Salvo"}</span>
    <button type="button" className="btn btn-secondary btn-sm" onClick={props.onSave}>
      Salvar
    </button>
  </header>
  ```
- **Impacto:** O usuário visualiza dois botões "Salvar" e dois indicadores de modificação na mesma tela vertical, gerando ambiguidade de persistência e desperdício de espaço.

### 3.2 Empilhamento Excessivo de Faixas Horizontais (Vertical Chrome)
Atualmente, no modo de edição Markdown, a área vertical acima do primeiro parágrafo de texto contém 4 faixas empilhadas:
1. `.app-toolbar` (~48px);
2. `.app-header-breadcrumb` (~32px);
3. `MarkdownEditor > header` (~38px com botão salvar redundante);
4. `FormattingToolbar` (~40px com 15+ botões de formatação).
- **Impacto:** Até 158px verticais consumidos exclusivamente por chrome permanente antes do início da área de escrita.

### 3.3 Proliferação de Botões Independentes de Exportação
- Atualmente, a TopBar adiciona um botão separado para cada formato: `[HTML]` e `[PDF]`, com o iminente `[EPUB]` somando mais um elemento.
- **Impacto:** Em resoluções menores (< 1280px), os botões da TopBar sofrem quebra de linha ou colidem com o seletor de visualização.

### 3.4 Descontinuidade de Sidebar e Falta de Activity Rail Dedicada
- Quando a barra esquerda é recolhida, o botão `📁` é renderizado como um `<aside className="rail left-rail">` ad-hoc.
- Não há uma estrutura de Activity Rail permanente e unificada que permita acoplar futuras ferramentas (Workspace Search, TODO, etc.) sem mexer no layout do editor.

---

## 4. Matriz de Ações (Globais vs. Contextuais)

| Ação / Controle | Local Atual | Destino no Layout Canônico (Onda 0D) | Justificativa |
| :--- | :--- | :--- | :--- |
| **Alternar Sidebar Esquerda** | Botão `≡` no Header | Activity Rail permanente à esquerda | Pertence à navegação de ferramentas de workspace (`007`). |
| **Identidade / Breadcrumb** | 2ª linha no Header | Linha única da TopBar (lado esquerdo) | Unifica a visualização "Onde estou" em uma única faixa horizontal. |
| **Seletor de Modo (3 modos)** | Esquerda do Header | Centro da TopBar consolidada | Ponto focal da leitura/edição ("Como estou vendo"). |
| **Estado de Salvamento** | Duplicado (Header + Editor) | Badge passivo no TopBar consolidada | Estado não é ação; fica visível sem poluir o editor (`003`). |
| **Ação Salvar** | Duplicado (Header + Editor) | Ação única global / Atalho `Ctrl+S` | Remoção da faixa interna do `MarkdownEditor` (`003`). |
| **Ações de Exportação** | Botões HTML e PDF separados | Menu único dropdown `[Exportar ▾]` | Consolidação estável de saída (`004`). |
| **Novo Documento (`Ctrl+N`)** | Botão `➕` no Header | Botão com ícone vetorial na TopBar | Padronizado via design system e `009`. |
| **Busca de Arquivos (`Ctrl+P`)** | Botão `🔍` no Header | Ícone de busca rápida na TopBar | Atalho visível integrado à Command Palette. |
| **Modo Apresentação (`F5`)** | Botão `📽️` no Header | Ação da TopBar (quando doc ativo) | Controle global de projeção. |
| **Configurações (`Ctrl+,`)** | Botão `⚙` no Header | Ícone de engrenagem na TopBar | Preferências globais do produto. |
| **Alternar Inspector (Direita)** | Botão `≡` no Header | Botão de alternância na TopBar | Controla a visibilidade do painel direito. |
| **Formatação de Texto** | FormattingToolbar em linha | Toolbar compacta agrupada / Slash Menu | Ação contextual de edição (`008`). |
| **Métricas / Sync / GoToLine** | StatusBar no rodapé | Mantido no StatusBar | Informações não intrusivas de leitura e edição. |

---

## 5. Diretrizes para a Implementação do Shell Canônico

1. **Preservação Absoluta de Contratos:**
   - Nenhum hook, comando IPC, atalho de teclado ou contrato de persistência (`saveDocument`, `atomic_save`, `autosave`) deve ser alterado durante o refinamento do shell.
2. **Eliminação do Header Interno do Editor:**
   - Na tarefa `003-salvar-unico.md`, o `<header>` dentro de `MarkdownEditor.tsx` será removido, recuperando imediatamente 38px verticais para o editor.
3. **Fusão da Linha de Breadcrumb na TopBar:**
   - Na consolidação do UI Shell, o Breadcrumb passa a conviver horizontalmente à esquerda da TopBar junto com o nome do arquivo, liberando a segunda linha permanente do header.
4. **Reserva de Espaço para a Activity Rail (`007`):**
   - A margem esquerda do workspace acomodará a Activity Rail (48px) de forma estável, permitindo abrir e recolher o painel de arquivos sem jank no CodeMirror.

---

## 6. Conclusão do Inventário

O inventário confirma que o MD Studio possui todos os componentes funcionais necessários, mas sofre de sobreposição visual por faixas empilhadas e controles de persistência redundantes.

Com este mapeamento concluído e documentado, as fundações estão prontas para a execução paralela das tarefas granulares da Onda 0D:
- **`003`**: Remoção da duplicação do comando Salvar;
- **`004`**: Exportar como menu único;
- **`005`**: Largura controlada no Preview formatado;
- **`006`**: Gutter do CodeMirror alinhado aos temas Catppuccin;
- **`007`**: Workspace Rail (Activity Rail + Workspace Panel).
