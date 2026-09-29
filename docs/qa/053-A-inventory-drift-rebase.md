# Relatório do Gate de Admissão — 053-A (Inventory, Drift, Capability Rebase & TCG Reprojection)

**Artefato:** `docs/qa/053-A-inventory-drift-rebase.md`  
**Data:** 2026-09-28  
**Autor:** Antigravity (runner ESAA `antigravity`, actor `agent-impl`)  
**Tarefa ESAA:** `MD-GUI-053-A` (referência normativa: 053-A)  
**Status:** **APROVADO (GATE DE ADMISSÃO PASS)**  
**Regra Temporal:** `projection < first_code_edit` (Nenhuma linha de código de produção ou interface modificada nesta tarefa).

---

## 1. Sumário Executivo

A tarefa **`MD-GUI-053-A`** constitui o **Gate de Admissão Formal da Onda 053 — Nova GUI R3 do MD Studio**. O objetivo desta tarefa é descobrir, inventariar e mapear com rigor cirúrgico a base real sobre a qual a nova interface de produto será construída, confrontando:
1. O **TCG do Protótipo Funcional** (`v6-final`, `FINALIZED`, 214 nós, 570 arestas, 23 fluxos, 21 change slices, 23 invariantes, 45 findings);
2. A **Especificação Mestra** `053-nova-gui-R3.md`;
3. A **Produção Real do MD Studio** após a conclusão integral da onda v0.4, da onda v0.5 e do hotfix de estabilização desktop Linux (`MD-HOTFIX-V05-BOOT-001`).

### Principais Conclusões:
- **Baseline de Código:** HEAD real em `6fbe64ae4b9ee447d7c2de697ba0dd37a6708806`. Todas as capabilities v0.4 e v0.5 estão operacionais, com **109 arquivos de teste e 628 testes Vitest (100% PASS)**, **21 testes Cargo Rust (100% PASS)**, `pnpm typecheck` com **0 erros** e o teste de inicialização desktop `scripts/desktop-smoke-test.sh` aprovado.
- **Diferenciação Crítica Mockup vs Produção:** O protótipo v6-final é estritamente uma referência ergonômica, de hierarquia visual e modelo de interação. Mecanismos simulados do mockup (parser simplificado, editor simulado, fake filesystem, stores demonstrativos, diff posicional) são expressamente rejeitados para produção. O MD Studio real utiliza React 19, TypeScript, CodeMirror 6, Tauri 2, Rust (`md-studio` e `md-studio-core`), pipeline Unified (Remark/Rehype), MetadataIndex e o Path Fencing.
- **Desacoplamento Visual e Documental:** O core multi-documento (`DocumentRuntime` + `OpenDocumentsRuntime`) antecede a projeção visual de abas (`DocumentTabs`). O `DocumentInspector` deriva exclusivamente de dados canônicos do AST/MetadataIndex e nunca do DOM do Preview.
- **Identidade de Conteúdo vs Geração de Operações:** `dirty` é derivado de equivalência de hash de conteúdo (`contentIdentity`), e não de contador de revisões. Um `undo` até o conteúdo gravado em disco restabelece o estado `clean`.

---

## 2. Inventário de Capabilities Existentes (Rebase Pós-v0.4 e Pós-v0.5)

A Nova GUI não recriará funcionalidades existentes: ela reorganizará, unificará e migrará o acesso a essas capacidades dentro da nova arquitetura de Workspace e Shell Integrado.

### 2.1. Capabilities da Onda v0.3 (Engineering Authoring)
| Capability | Arquivos / Componentes Principais | Contratos & Estado | Preservação no 053 |
|---|---|---|---|
| **MD Doctor** | `src/services/mdDoctor.ts`, `src/components/header/MDDoctorModal.tsx` | Diagnóstico de integridade Markdown | Integrar ao menu/ações da Sidebar e Inspector |
| **Smart References** | `src/editor/references/smartReferences.ts` | Autocomplete contextual de referências | Preservar no CodeMirror 6 |
| **Asset Manager** | `src/services/assetManager.ts`, `src-tauri/crates/md-studio-core/src/workspace.rs` | Resolução e cópia segura de assets com Path Fencing | Integrar à navegação de arquivos da Sidebar |
| **Writing Quality** | `src/services/writingQuality.ts` | Análise de legibilidade e estilo | Integrar ao Document Inspector |
| **Table Data Paste** | `src/editor/table/pasteTable.ts` | Conversão inteligente de TSV/CSV para GFM table | Preservar no CodeMirror 6 |
| **Advanced Code Blocks** | `src/components/CodeBlock.tsx`, `src/editor/formatting/formatCodeBlock.ts` | Shiki highlight e formatação de blocos | Preservar nos renderizadores |
| **Preview ↔ Source Mapping** | `src/markdown/processor.ts`, `src/components/MarkdownViewer.tsx` | Data-lines e scroll sync bidirecional | Refinar na Task 053-M |
| **Workspace Search** | `src/components/command/WorkspaceSearchModal.tsx`, `src-tauri/src/search/` | Busca textual indexada via Rust | Manter atalho global e quick access |

### 2.2. Capabilities da Onda v0.4 (Documentation Engineering)
| Capability | Arquivos / Componentes Principais | Contratos & Estado | Preservação no 053 |
|---|---|---|---|
| **Local History / Time Machine** | `src/components/history/LocalHistoryPanel.tsx`, `src/services/historyDiff.ts`, `src/styles/local-history.css` | Snapshot atômico temporal de revisões | Integrar ao Inspector unificado (Task 053-O) |
| **Block References** | `src/markdown/plugins/wiki-links.ts` (`^block-id`), `src/components/wiki/` | Ancoragem de blocos semânticos | Preservar no pipeline semântico |
| **TODO Explorer** | `src/components/todo/TodoExplorer.tsx`, `src/services/todoExplorer.ts` | Extração de anotações `[ ]` e `[x]` | View contextual na Sidebar/Inspector |
| **TOC Manager** | `src/services/tocManager.ts`, `src/components/DocumentOutline.tsx` | Árvore de cabeçalhos com reordenação | Integrar como seção principal do Inspector |
| **Bookmarks** | `src/services/bookmarkStore.ts`, `src/editor/bookmarks/bookmarkGutter.ts` | Marcadores visuais em linhas com navegação rápida | Preservar gutter e atalhos de navegação |
| **Knowledge Graph** | `src/services/knowledgeGraph.ts`, `src/components/graph/` | Projeção em memória de nós e arestas do workspace | Manter base para futuro Graph Explorer |
| **Impact Analysis** | `src/services/impactAnalysis.ts` | Cálculo de dependências transitivas e raio de impacto | Disponível via Inspector / Comandos |
| **Local Graph Modal** | `src/components/graph/LocalGraphModal.tsx`, Cytoscape.js | Subgrafo focal concêntrico por nota | Modal preservado via atalhos e Inspector |
| **Path Explorer** | `src/components/graph/PathExplorerModal.tsx` | Busca do caminho mais curto entre duas notas | Modal preservado via comandos |
| **Document Inspector** | `src/components/inspector/DocumentInspector.tsx`, `src/services/documentInspector.ts` | Métricas de palavras, leitura, cabeçalhos | Seção nativa do novo Inspector Unificado |
| **Workspace Analytics** | `src/components/analytics/WorkspaceAnalyticsModal.tsx` | Métricas globais de coesão do workspace | Modal preservado via menu da Workspace Sidebar |
| **Workspace Health** | `src/components/health/WorkspaceHealthPanel.tsx`, `src/services/workspaceHealth.ts` | Diagnóstico de links quebrados e órfãos | Seção de saúde no novo Inspector/Sidebar |
| **Structural Search** | `src/components/search/StructuralSearchModal.tsx` | Busca estruturada por tags, headings e regex | Modal preservado via atalho global |
| **Git Enxuto** | `src-tauri/crates/md-studio-core/src/git.rs`, `src/components/git/FileHistoryModal.tsx`, `src/editor/git/gitGutter.ts` | Status Git offline, diff gutter e histórico | Gutter e modal preservados no editor/sidebar |
| **Unified Right Panel** | `src/components/layout/UnifiedRightPanel.tsx` | Acordeão/abas de Outline, Links, Backlinks, Health | Base direta para a evolução do Inspector 053-O |
| **File Tree States** | `src/services/fileStateAggregator.ts`, `src/types/file-tree.ts`, `src/components/explorer/*` | Badges de status (dirty, git, health) | Integrar diretamente na WorkspaceSidebar (053-J) |

### 2.3. Capabilities da Onda v0.5 (Interoperability, Diagrams & Publishing)
| Capability | Arquivos / Componentes Principais | Contratos & Estado | Preservação no 053 |
|---|---|---|---|
| **Import Hub** | `src/services/importHub.ts`, `src-tauri/crates/md-studio-core/src/importer.rs`, `src-tauri/src/commands/importer.rs` | Dispatch seguro de importação multimodal com Path Fencing | CTA no Workspace Home e Sidebar (053-J, 053-K) |
| **MarkItDown Adapter** | `src/services/markitdownAdapter.ts` | Conversão offline de documentos externos | Integrado via Import Hub |
| **Import Preview Modal** | `src/components/import/ImportPreviewModal.tsx`, `src/services/importPreview.ts` | Pré-visualização split antes do commit no workspace | Modal invocado na importação |
| **Import Fidelity Classes** | `src/services/importFidelity.ts` | Classificação determinística (`High`, `Intermediate`, `Best Effort`) | Badges e relatórios de importação |
| **Publishing Engine** | `src/services/publishingEngine.ts`, `src/contracts/publishingTypes.ts` | Motor unificado de publicação com múltiplos alvos e cancelamento | Menu Documento / Export no Header e Toolbar |
| **HTML Autocontido** | `src/services/htmlSelfContainedExporter.ts` | Exportação de HTML estático com CSS e KaTeX embutidos | Opção de exportação do Publishing Engine |
| **EPUB 3 Packaging** | `src-tauri/crates/md-studio-core/src/importer.rs`, `src/services/publishingEngine.ts` | Gerador atômico de EPUB 3 com SVG e nav.xhtml | Opção de exportação do Publishing Engine |
| **Editorial Fallback** | `src/services/editorialFallback.ts` | Degradação graciosa de diagramas e elementos complexos | Preservado no pipeline de exportação |
| **Mermaid Explorer** | `src/services/mermaidExplorer.ts`, `src/components/diagrams/MermaidExplorerPanel.tsx`, `MermaidExpandedModal.tsx` | Catálogo de diagramas do documento com zoom modal | Aba/seção do Inspector contextual |
| **Diagram Engine Registry** | `src/services/diagramEngineRegistry.ts`, `src/components/DiagramBlock.tsx`, Graphviz/DOT, WaveDrom | Registry extensível de engines com sanitização estrita | Pipeline de preview e exportação |

### 2.4. Protected Area de Startup Desktop Linux (Hotfix v0.5)
| Restrição / Invariante | Implementação | Propósito | Regra de Governança |
|---|---|---|---|
| `INV-DESKTOP-LAUNCHER-ENV` | `src-tauri/linux/md-studio.desktop`, `scripts/desktop-smoke-test.sh` | Forçar `GDK_BACKEND=x11` e `WEBKIT_DISABLE_DMABUF_RENDERER=1` | **PROIBIDO REMOVER OU ENFRAQUECER** |
| WebKitGTK Handshake | `src-tauri/src/lib.rs`, `src-tauri/src/main.rs` | Inicialização saudável sem congelamento de render | Proibido alterar sem smoke test |
| Desktop Smoke Test | `scripts/desktop-smoke-test.sh` | Validação real de mapeamento de janela X11 e WebKit | Gate obrigatório em alterações de AppShell |

---

## 3. Matriz Formal de Migração: Protótipo (v6-final) → Produção Real

### 3.1. Mapeamento de Change Slices (21 Slices do Protótipo)
| ID do Slice no Protótipo | Nome / Escopo do Protótipo | Componente / Subsistema de Produção Alvo | Ação de Migração | Task Destino |
|---|---|---|---|---|
| `SLICE-PROTO-GLOBAL-HEADER` | Header superior global com título, busca e ações | `src/components/shell/GlobalAppBar.tsx` substituindo `src/components/header/AppHeader.tsx` | Decompor e migrar controles para App Bar unificada | `053-I` |
| `SLICE-PROTO-LEFT-WORKSPACE` | Sidebar de workspace unificada (pastas, arquivos, ações) | `src/components/workspace/WorkspaceSidebar.tsx` absorvendo `FileExplorer.tsx` e aposentando visualmente `WorkspaceRail.tsx` | Unificar navegação, arquivos e ações de workspace em uma única sidebar | `053-J` |
| `SLICE-PROTO-WELCOME` | Tela de boas-vindas com CTAs de workspace e recentes | `src/components/workspace/WorkspaceHome.tsx` e `WelcomeScreen.tsx` | Transformar em Workspace Home; CTA principal "Abrir Workspace" | `053-K` |
| `SLICE-PROTO-DOCUMENT-BAR` | Barra de topo do documento ativo com título, path e status | `src/components/document/DocumentBar.tsx` | Integrar com título, status de sincronização e controles | `053-L` |
| `SLICE-PROTO-SPLIT` | Container de split horizontal e vertical com resizer | `src/components/layout/SplitLayout.tsx` e `useResizablePanel.ts` | Suporte a orientação bidirecional (vertical/horizontal) e proporção persistida | `053-M` |
| `SLICE-PROTO-EDITOR` | Superfície do editor CodeMirror com gutter e busca | `src/components/editor/EditorPane.tsx` + CodeMirror 6 extensions | Manter CodeMirror 6 real; desacoplar de layout global | `053-D`, `053-F` |
| `SLICE-PROTO-PREVIEW` | Painel de preview Markdown com toolbar e modos | `src/components/preview/PreviewPane.tsx` + `MarkdownViewer.tsx` | Toolbar de preview com zoom, submodes e maximizar | `053-N` |
| `SLICE-PROTO-INSPECTOR` | Painel lateral direito contextual (TOC, links, stats) | `src/components/inspector/UnifiedInspector.tsx` evoluindo `UnifiedRightPanel.tsx` | Reorganizar seções: TOC, Links, Backlinks, Diagrams, Health | `053-O` |
| `SLICE-PROTO-PERSISTENCE-FEEDBACK` | Feedback visual de estado de gravação e sincronismo | `src/components/statusbar/StatusBar.tsx` + `DocumentBar.tsx` | Estados discretos: `saved`, `modified`, `saving`, `conflicted`, `error` | `053-P` |
| `SLICE-PROTO-THEME` | Seleção de temas Dark/Light com consistência | `src/styles/tokens.css`, `src/state/settings.ts` | Centralizar tokens CSS; paridade estrita dark/light | `053-H` |
| `SLICE-PROTO-KEYBOARD` | Atalhos globais e navegação por teclado | `src/hooks/useKeyboardShortcuts.ts` | Preservar atalhos existentes (Ctrl+P, Ctrl+S, etc.) e adicionar novos | `053-R` |
| `SLICE-PROTO-TABS` | Barra de abas com fechar, dirty guard e ativação | `src/components/document/DocumentTabs.tsx` | Projeção visual das abas baseada em `OpenDocumentsRuntime` | `053-L` |
| `SLICE-PROTO-ACCESSIBILITY` | Atributos WAI-ARIA, contraste e foco | Shell, modais, tabs e treeview | Garantir conformidade acessível com focus trap/restore | `053-R` |
| `SLICE-PROTO-RENDER-SAFETY` | Prevenção de travamentos por renderização incorreta | Error boundaries React + Sanitizer pipeline | Error boundaries pontuais por componente | `053-G`, `053-T` |
| `SLICE-PROTO-DOCUMENT-STATE-INTEGRITY` | Isolamento de estado editorial e garantia de save | `DocumentRuntime`, `SaveQueue`, `contentIdentity` | Provar desacoplamento de dirty vs revision monotônica | `053-B`, `053-F` |
| `SLICE-PROTO-PREVIEW-MODE-MACHINE` | Submodos de preview: Visualização, HTML, Diff | `src/components/preview/PreviewPane.tsx` | Submodos feature-gated (View, View\|HTML, View\|HTML\|Diff) | `053-N` |
| `SLICE-PROTO-TOC-PROJECTION` | Atualização do TOC no Inspector sem depender do DOM | `src/services/tocManager.ts`, `extractOutline()` | TOC derivado diretamente do pipeline AST, independente do Preview | `053-G`, `053-O` |
| `SLICE-PROTO-GUTTER` | Sincronismo entre scroll do editor e gutter de linhas | CodeMirror 6 Gutter Extension nativa | Utilizar gutter nativo do CodeMirror (não div HTML simulada) | `053-D` |
| `SLICE-PROTO-STATEFUL-A11Y` | Acessibilidade de controles com estado programático | Componentes de UI (botões de modo, dropdowns) | Exposição de `aria-pressed`, `aria-expanded`, `aria-selected` | `053-R` |
| `SLICE-PROTO-SEARCH-BEHAVIOR` | Busca global e local com navegação | `CommandPalette.tsx`, `StructuralSearchModal.tsx` | Preservar busca real indexada e navegação de resultados | `053-J`, `053-Q` |
| `SLICE-PROTO-DIFF-FIDELITY` | Comparação de diferenças de texto com o salvo | `src/services/historyDiff.ts` (algoritmo diff real) | Proibir comparação posicional ingênua do protótipo | `053-N` |

---

### 3.2. Mapeamento dos 23 Fluxos do Protótipo
| ID do Fluxo | Nome / Intenção | Implementação Real no MD Studio | Ação de Migração |
|---|---|---|---|
| `FLOW-PROTO-STARTUP-WELCOME` | Inicialização -> Welcome | Shell inicial sem workspace -> WorkspaceHome | Exibir WorkspaceHome com lista de recentes |
| `FLOW-PROTO-OPEN-DOCUMENT` | Selecionar arquivo -> Documento ativo | `openDocument(path)` em `OpenDocumentsRuntime` | Carregar runtime do documento e focar aba |
| `FLOW-PROTO-EDIT-DIRTY-SAVE` | Editar -> Modificado -> Salvar -> Salvo | `contentIdentity` hashing + `SaveQueue` atômico | Hash check: se igual ao persistido, clean |
| `FLOW-PROTO-VIEW-MODES` | Alternar Markdown / Formatado / Dividida | `ViewMode` store + SplitLayout | Alternar visibilidade e flex do Editor/Preview |
| `FLOW-PROTO-SPLIT-RESIZE` | Orientar e redimensionar split | `SplitLayout` + `SplitDivider` com persistência | Suporte a orientação horizontal e vertical |
| `FLOW-PROTO-GLOBAL-SEARCH` | Ctrl+P -> Quick Switcher / Palette | `CommandPalette` e `WorkspaceSearch` | Acionar quick switcher sobre arquivos do workspace |
| `FLOW-PROTO-LOCAL-SEARCH` | Ctrl+F -> Busca no documento | CodeMirror 6 Search Extension | Invocar painel de busca integrado do CodeMirror |
| `FLOW-PROTO-THEME` | Tema global Dark / Light | `themeStore` + CSS tokens | Alternar tema sem reiniciar aplicação |
| `FLOW-PROTO-INSPECTOR` | Documento -> Inspector contextual | `DocumentInspector` alimentado por AST canônico | Atualizar sumário, links e métricas |
| `FLOW-PROTO-CLOSE-TAB-DIRTY` | Fechar aba com dirty guard | Diálogo de confirmação de save antes do close | Salvar, descartar ou cancelar fechamento |
| `FLOW-PROTO-TREE-KEYBOARD` | Navegação da árvore por teclado | `FileTree` com setas e Enter | ARIA tree pattern com ArrowUp/Down/Left/Right |
| `FLOW-PROTO-SAVE-TARGET` | Salvar documento endereçado | `SaveTicket` vinculando `documentId` e `path` | Gravação atômica via Rust backend |
| `FLOW-PROTO-DISCARD-DIRTY` | Descartar modificações | Reverter buffer para conteúdo persistido | Restaurar baseline de disco |
| `FLOW-PROTO-PREVIEW-MAXIMIZE` | Maximizar e restaurar preview | Estado de layout maximizado | Ocultar temporariamente painel do editor |
| `FLOW-PROTO-PREVIEW-ZOOM` | Zoom de preview | CSS zoom / transform controlado no container | Zoom controlado sem quebrar o layout externo |
| `FLOW-PROTO-PREVIEW-SUBMODES` | Alternar Visualização / HTML / Diff | Submodes em `PreviewPane` | Alternar view sem reexecutar pipeline desnecessário |
| `FLOW-PROTO-TABS-KEYBOARD` | Navegação de abas por teclado | ARIA tablist pattern | ArrowLeft/Right e Ctrl+W para fechar |
| `FLOW-PROTO-MODAL-FOCUS` | Ciclo de foco de modais | Dialogs nativos com focus trap | Retornar foco ao elemento que abriu o modal |
| `FLOW-PROTO-TOC-PROJECTION` | Heading editado -> TOC atualizado | `extractOutline` via Worker/AST debounce | Projeção canônica sem consultar o DOM do preview |
| `FLOW-PROTO-GUTTER-SCROLL` | Gutter do editor acompanha scroll | Gutter nativo CodeMirror 6 | Renderizado em sincronismo pelo CodeMirror |
| `FLOW-PROTO-SAVE-EDIT-RACE` | Edição durante save assíncrono | `operationGeneration` e `SaveTicket` | ACK de save anterior não limpa dirty de nova edição |
| `FLOW-PROTO-NEW-UNTITLED-SAVE` | Novo documento sem path -> Save As | `UntitledStore` isolado no storage privado | Promoção de rascunho apenas no Save As formal |
| `FLOW-PROTO-DIFF-INSERTION` | Linha alterada -> Diff vs salvo | `diffLines` via serviço canônico | Diff estruturado de sequências |

---

### 3.3. Mapeamento dos Findings Deferidos do Protótipo (19 Deferrals)
| Finding ID | Severidade | Descrição do Problema no Protótipo | Tratamento Arquitetural na Aplicação Real | Task Alvo |
|---|---|---|---|---|
| `FND-PROTO-004` | Alta | Teclado da árvore incompleto (ARIA) | Implementar ARIA Treeview Pattern completo em `FileTree` | `053-R` |
| `FND-PROTO-016` | Média | Abas não preservam cursor e scroll | `DocumentRuntime` armazena cursor/scroll por `documentId` | `053-F`, `053-L` |
| `FND-PROTO-019` | Média-Alta | Gutter e soft wrap dessincronizados | Utilizar CodeMirror 6 nativo com métricas reais | `053-D` |
| `FND-PROTO-020` | Alta | Command Palette com listbox incompleto | Acessibilidade de lista com `aria-activedescendant` | `053-R` |
| `FND-PROTO-021` | Alta | Abas sem semântica WAI-ARIA completa | `role="tablist"`, `role="tab"`, `aria-selected` | `053-R` |
| `FND-PROTO-028` | Média-Alta | Tablist sem navegação completa por setas | Navegação cíclica por ArrowLeft/Right nas abas | `053-R` |
| `FND-PROTO-029` | Média | ArrowLeft não colapsa pasta na árvore | Comportamento padrão de Explorer: colapsar ou ir ao pai | `053-R` |
| `FND-PROTO-030` | Alta | Modais sem focus trap e restore | Focus trap com retorno de foco ao trigger original | `053-Q`, `053-R` |
| `FND-PROTO-032` | Média | Zoom via CSS transform quebra layout | Zoom em container com scroll container independente | `053-N` |
| `FND-PROTO-034` | Alta | Gutter textarea dessincronizado no scroll | Superado pelo uso do CodeMirror 6 em produção | `053-D` |
| `FND-PROTO-035` | Média | Controles visuais sem estado programático | Adicionar `aria-pressed` nos botões de toggle | `053-R` |
| `FND-PROTO-036` | Média | Acordeões sem `aria-expanded` | Adicionar `aria-expanded` e `aria-controls` | `053-R` |
| `FND-PROTO-037` | Média | Toasts sem live region | Adicionar container com `role="status"` ou `aria-live` | `053-Q` |
| `FND-PROTO-038` | Média | Arquivos recentes não operáveis por teclado | Lista acessível de recentes com suporte a setas/Enter | `053-K`, `053-R` |
| `FND-PROTO-039` | Média | Scroll sync proporcional quebra âncoras | Scroll sync baseado em `data-line` source mapping | `053-M` |
| `FND-PROTO-041` | Média | Zoom menu sem semântica de popup acessível | Popup menu com `role="menu"` e navegação por teclado | `053-R` |
| `FND-PROTO-043` | Alta | Save assíncrono limpa dirty de edição nova | `contentIdentity` + `operationGeneration` guard | `053-B`, `053-F` |
| `FND-PROTO-044` | Alta | Untitled nasce com caminho de arquivo falso | `UntitledStore` sem path em disco; Save As formal | `053-C`, `053-F` |
| `FND-PROTO-045` | Média-Alta | Diff simulado por comparação posicional | Serviço de Diff real baseado em sequência de linhas | `053-N` |

---

## 4. Reconciliação do TCG de Produção (Baseline G4+)

### 4.1. Auditoria de Cobertura da Baseline G4
A auditoria revelou que as implementações da onda v0.5 (`MD-V05-042` a `MD-V05-052`) e o hotfix `MD-HOTFIX-V05-BOOT-001` foram concluídos no código e cobertos por testes unitários e de integração, mas não possuíam seus nós de features, contratos e testes catalogados formalmente em `features.yaml`, `contracts.yaml` e `nodes.yaml`.

### 4.2. Inclusões Normativas no TCG de Produção:
1. **Novas Features Catalogadas:**
   - `FEAT-IMPORT-HUB`: Hub unificado de importação com orquestração de parsers.
   - `FEAT-MARKITDOWN-ADAPTER`: Adapter offline de conversão multimodal.
   - `FEAT-IMPORT-PREVIEW`: Modal de visualização comparativa pré-commit.
   - `FEAT-IMPORT-FIDELITY`: Contrato estático de fidelidade por formato.
   - `FEAT-PUBLISHING-ENGINE`: Motor de exportação com orquestração assíncrona.
   - `FEAT-HTML-SELF-CONTAINED`: Exportador HTML 100% autocontido.
   - `FEAT-EPUB3-EXPORT`: Gerador atômico de pacotes EPUB 3 com SVG e nav.xhtml.
   - `FEAT-EDITORIAL-FALLBACK`: Tolerância e degradação graciosa em publicação.
   - `FEAT-MERMAID-EXPLORER`: Catálogo e navegação de diagramas do documento.
   - `FEAT-DIAGRAM-ENGINES-REGISTRY`: Registry extensível de engines (DOT, WaveDrom).
2. **Novos Contratos Catalogados:**
   - `CTR-IMPORT-HUB`: Contrato de requisição e resultado de importação.
   - `CTR-MARKITDOWN`: Contrato do adapter MarkItDown local.
   - `CTR-PUBLISHING-ENGINE`: Tipos e opções do motor de publicação.
   - `CTR-DIAGRAM-REGISTRY`: Registry e interfaces de engines de diagramas.
3. **Novos Invariantes Validados:**
   - `INV-DESKTOP-LAUNCHER-ENV`: Garantia de flags `GDK_BACKEND=x11` e `WEBKIT_DISABLE_DMABUF_RENDERER=1` em ambiente desktop Linux.

---

## 5. Planejamento do DAG Governança ESAA (053-B até 053-T)

Com a conclusão do gate de admissão `MD-GUI-053-A`, o DAG formal para a execução autônoma é composto por:

```text
053-A (Concluída - Gate de Admissão)
  ↓
┌───────────────────────────────────────────────┐
│ Spikes Críticos de Runtime e Filesystem      │
│                                               │
│ 053-B: Content Identity, Dirty & Save Queue  │
│ 053-C: Untitled Recovery Store                │
│ 053-D: CodeMirror Multi-document Strategy     │
│ 053-E: Workspace Filesystem Reconciliation    │
└──────────────────────┬────────────────────────┘
                       ↓
053-F: DocumentRuntime + OpenDocumentsRuntime
                       ↓
053-G: Semantic Pipeline & Bounded Artifact Caches
                       ↓
053-H: Design Tokens & Iconography
                       ↓
053-I: Global AppShell
        ┌──────────────┴──────────────┐
        ↓                             ↓
053-J: Workspace Sidebar       053-K: Workspace Home
        └──────────────┬──────────────┘
                       ↓
053-L: DocumentTabs & DocumentBar
                       ↓
┌───────────────────────────────────────────────┐
│ Superfícies Coordenadas                       │
│                                               │
│ 053-M: Bidirectional Split Layout             │
│ 053-N: Preview Surface & Submodes             │
│ 053-O: Unified Inspector                      │
│ 053-P: Status & Persistence Feedback          │
│ 053-Q: Settings, Modals & Toasts              │
└──────────────────────┬────────────────────────┘
                       ↓
053-R: Keyboard & Accessibility
                       ↓
053-S: Desktop Responsiveness & Performance
                       ↓
053-T: Migration Cleanup & Full Regression
```

### Regras de Execução Autônoma:
- Nenhuma tarefa visual adiantará o runtime documental;
- O progresso avança estritamente pelas dependências do DAG;
- Toda e qualquer edição de código será precedida por projeção de impacto ESAA/TCG;
- A suíte de testes de inicialização desktop (`scripts/desktop-smoke-test.sh`) é validada continuamente após mudanças no AppShell.
