# Reconciliação do TCG — 2026-09-29

**Tarefa ESAA:** `MD-TCG-RECONCILE-20260929`  
**HEAD auditado:** `6dfd99840a9a87f79bc6eb8acf089bdeca374190`  
**source_commit mantido:** `2e5cce855888b404654002fef1d97ebc0db29cf7`  
**Snapshot anterior:** [`snapshots/pre-reconcile-20260929.json`](snapshots/pre-reconcile-20260929.json), SHA-256 `afe27642bd4e1fed876882b7e7df6e4fd26ed41afea865832209e9b18e296399`.

## Resultado da validação

- `build_graph.py`: concluído; grafo com 777 nós e 2.622 arestas (389 code, 167 test, 38 contract, 71 entrypoint, 59 feature, 22 flow, 12 invariant e 19 module).
- `validate.py`: status **pass**, 0 problemas críticos e 27 warnings. O `pass` confirma consistência interna no `source_commit` escolhido; não significa ausência de warnings nem prova que as âncoras acompanham o HEAD.
- `graph_json_stale`: 0; `source_commit_mismatch`: 0; âncoras e evidências válidas no commit de origem: 0 problemas críticos.

## Decisão sobre a baseline

O `source_commit` permanece em `2e5cce855888b404654002fef1d97ebc0db29cf7`. Não avancei o grafo para o HEAD: a comparação encontra 303 arquivos alterados no repositório, 115 arquivos de código/teste do produto alterados, e 80 arquivos de código/teste adicionados (27 deles em `tests/`) que não têm âncora no grafo atual. Existem ainda 139 nós ancorados em 23 caminhos alterados; em inspeção contra o HEAD, 83 símbolos não estão mais na linha inicial registrada e 5 intervalos excedem o tamanho atual do arquivo. Mover apenas o SHA deixaria a validação crítica e poderia atribuir os nós a código diferente.
A decisão preserva uma baseline coerente com o commit de origem e registra o drift atual como warning. Uma reconciliação que promova o grafo ao HEAD exige reancorar os nós/evidências por semântica e decidir a cobertura dos arquivos adicionados; deslocar números de linha automaticamente não é evidência suficiente.

## Âncoras em caminhos alterados

| Caminho | Nós potencialmente desatualizados |
|---|---:|
| `src-tauri/crates/md-studio-core/Cargo.toml` | 1 |
| `src-tauri/crates/md-studio-core/src/git.rs` | 1 |
| `src-tauri/src/commands/mod.rs` | 21 |
| `src-tauri/src/lib.rs` | 7 |
| `src-tauri/tauri.conf.json` | 2 |
| `src/App.tsx` | 26 |
| `src/components/MarkdownViewer.tsx` | 3 |
| `src/components/empty/WelcomeScreen.tsx` | 4 |
| `src/components/header/AppHeader.tsx` | 4 |
| `src/components/layout/SplitDivider.tsx` | 2 |
| `src/components/settings/SettingsPanel.tsx` | 1 |
| `src/contracts/types.ts` | 8 |
| `src/lib/ipc/client.ts` | 22 |
| `src/markdown/frontmatter.ts` | 2 |
| `src/markdown/processor.ts` | 9 |
| `src/markdown/sanitize.ts` | 4 |
| `src/state/documentState.ts` | 16 |
| `src/state/editor.ts` | 1 |
| `tests/desktop/desktop-launcher.test.ts` | 1 |
| `tests/empty/emptyState.test.tsx` | 1 |
| `tests/layout/splitView.test.tsx` | 1 |
| `tests/panel/collapsiblePanel.test.tsx` | 1 |
| `tests/settings/settingsPanel.test.tsx` | 1 |

**Total:** 139 nós em 23 caminhos. A lista integral de IDs está no item `source_commit_drift` de `validation.yaml`; estes são candidatos stale porque seus caminhos mudaram desde o `source_commit`.

## Warnings remanescentes

| Check | Quantidade | Itens/causa |
|---|---:|---|
| `entrypoints_without_flow` | 1 | ENT-IPC-RESOLVE-WIKI-LINK (IPC-RESOLVE-WIKI-LINK) |
| `orphan_services` | 1 | CLS-GIT-PROVIDER (class, src-tauri/crates/md-studio-core/src/git.rs) |
| `tests_without_mapped_node` | 13 | TST-TS-EDITOR-CURSOR; TST-TS-EDITOR-GUTTER; TST-TS-EDITOR-TABLE; TST-TS-HELP-CHEATSHEET; TST-TS-MARKDOWN-CODE-CODE; TST-TS-MARKDOWN-CORE-NAVIGATION-NAVIGATION-OUTLINE; TST-TS-MARKDOWN-FORMATTING; TST-TS-MARKDOWN-MATH-MATH-MATH; TST-TS-MARKDOWN-MATH-MATH-UNTRUSTED-KATEX-INPUT; TST-TS-UI-BUTTON; TST-TS-UX-BREADCRUMB; TST-TS-WORKSPACE-WORKSPACERAIL; TST-RS-NAV-AND-NCX-INCLUDE-H1-H2-ONLY |
| `invariants_with_gap` | 11 | INV-PATH-FENCE (partial); INV-FS-ONLY-VIA-RUST (none); INV-ATOMIC-SAVE (partial); INV-SHA256-CONFLICT (partial); INV-SANITIZE-PREVIEW-EXPORT (partial); INV-REMOTE-RESOURCES-BLOCKED (none); INV-WATCHER-ECHO-SUPPRESSION (partial); INV-EXPORT-NO-SILENT-OVERWRITE (partial); INV-OFFLINE-NO-TELEMETRY (none); INV-DESKTOP-LAUNCHER-ENV (partial); INV-NO-DENIED-DEPENDENCY-ADVISORY (none) |
| `source_commit_drift` | 1 | HEAD difere do source_commit; 303 caminhos alterados e 139 nós possivelmente stale (ver tabela acima e YAML de validação). |

Warnings de cobertura sem alteração nesta reconciliação: 1 entrypoint sem flow (`ENT-IPC-RESOLVE-WIKI-LINK`), 1 serviço órfão (`CLS-GIT-PROVIDER`), 13 testes sem nó mapeado e 11 invariantes com gap. As 11 invariantes são: `INV-PATH-FENCE`, `INV-FS-ONLY-VIA-RUST`, `INV-ATOMIC-SAVE`, `INV-SHA256-CONFLICT`, `INV-SANITIZE-PREVIEW-EXPORT`, `INV-REMOTE-RESOURCES-BLOCKED`, `INV-WATCHER-ECHO-SUPPRESSION`, `INV-EXPORT-NO-SILENT-OVERWRITE`, `INV-OFFLINE-NO-TELEMETRY`, `INV-DESKTOP-LAUNCHER-ENV` e `INV-NO-DENIED-DEPENDENCY-ADVISORY`. Os 5 nós `dead_code`/`test_only` e 14 divergências de feature são achados `info`, não warnings.
Não há contrato sem consumidor (0) nem grafo desatualizado em relação aos insumos (0). As 27 warnings são 1 entrypoint + 1 serviço órfão + 13 testes sem nó + 11 gaps de invariantes + 1 drift de source_commit.

## Cobertura adicionada desde G3

A baseline mantém 777 nós e 2.622 arestas, os mesmos totais do grafo preservado antes da reconciliação. Os relatórios históricos `g4-graph-delta.md` e `g4-plus-053a-delta.md` afirmam integração completa da onda v0.5/GUI; essa completude não é sustentada como cobertura de arquivos pelo grafo atual, pois 80 caminhos adicionados permanecem sem âncora. Os relatórios históricos foram mantidos; este resultado não os usa como prova de cobertura integral.
Nenhum arquivo de código ou teste do produto foi alterado. Nesta tarefa, nodes, edges, tests, contracts, features, flows e invariants não receberam mudanças semânticas; o `graph.json` foi regenerado a partir dos mesmos insumos e o `validation.yaml` foi atualizado para o HEAD auditado.

## Próximo trabalho necessário

Criar uma tarefa própria para promover a baseline ao HEAD: reancorar manualmente os nós e evidências afetados, incorporar os módulos/testes novos selecionados e só então atualizar `source_commit`, rebuild e validação. Manter a baseline atual até essa reconciliação evitará declarar uma cobertura que o grafo não demonstra.
