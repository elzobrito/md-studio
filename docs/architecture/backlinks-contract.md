# Contrato de Backlinks — Onda 3 v3.1

**Task:** `MD-BACKLINK-001`  
**Verify:** `md_backlink_001_contract_pass`  
**WBS:** `docs/onda3/WBS-ONDA-3-BACKLINKS-v3.1.md`  
**Repo:** `/home/elzobrito/desenvolvimento/md-studio`  
**Mapeamento:** 2026-09-19, paths confirmados com `rg`/`find` no tree atual.

Este arquivo congela o contrato para `MD-BACKLINK-002`…`008`. Não cria módulos.
Onda 2 permanece intocada: o resolvedor, o parser e o painel de links de saída
não mudam de regra.

A WBS v3.1 no disco está compacta. As **Decisões fechadas** dessa WBS são o
§5. Os tipos Rust/TS abaixo são o §9 canônico (não numerado no arquivo curto).

---

## 1. Objetivo

Índice reverso de Wiki Links internos + painel Backlinks no painel direito
já existente. Consulta sob demanda. Sem grafo.

---

## 2. Mapa de paths reais (Onda 2 — reusar)

Confirmado no tree. Não criar paralelos com os mesmos papéis.

### 2.1 Core Rust (`md-studio-core`)

| Símbolo | Path real | Papel |
|---|---|---|
| `WikiLink { target, alias, line }` | `src-tauri/crates/md-studio-core/src/index/document_metadata.rs` | Extração; `line` já é base 1 |
| `WikiLinkStatus { Resolved, Unresolved, Ambiguous }` | `src-tauri/crates/md-studio-core/src/index/wiki_resolve.rs` | Sem variante `Collision` — **não adicionar** |
| `ResolvedWikiLink` | mesmo arquivo | `status` + `path` + `candidates` |
| `MetadataIndex::resolve_wiki_link` / `resolve_all` | mesmo arquivo (`impl MetadataIndex`) | Resolução pura sobre o índice |
| `MetadataIndex` | `src-tauri/crates/md-studio-core/src/index/metadata_index.rs` | `documents: HashMap<PathBuf, DocumentMetadata>` |
| `ReindexEngine` | `src-tauri/crates/md-studio-core/src/index/reindex_engine.rs` | `full_reindex`, `reindex_file`, `remove_file` |
| `save_index` / `load_index` | `src-tauri/crates/md-studio-core/src/index/index_persistence.rs` | Persistência **só** do metadata (`.mdstudio/index.json`) |
| Parser `[[alvo]]` / `[[alvo\|alias]]` | `src-tauri/crates/md-studio-core/src/parser/wiki_link_parser.rs` | `line = line_idx + 1` |
| Barrel | `src-tauri/crates/md-studio-core/src/index/mod.rs` e `src/lib.rs` | Reexporta WikiLink / resolve / engine |
| Regras de resolve | `docs/onda2/resolve-rules.md` | Path exato → stem CI → título CI |

### 2.2 App Tauri

| Símbolo | Path real | Papel |
|---|---|---|
| `save_document` | `src-tauri/src/commands/mod.rs` | Save atômico; em sucesso chama `reindex_file` + `save_index`. Falha de índice **não** bloqueia save |
| IPC wiki | `src-tauri/src/commands/metadata.rs` | `get_wiki_links_for`, `resolve_wiki_link`, `get_resolved_wiki_links_for`, `trigger_reindex`, `get_document_metadata`, `get_all_documents` |
| Registro IPC | `src-tauri/src/lib.rs` (`invoke_handler`) | Sem `get_backlinks` hoje |
| `AppState.metadata_engine` | `src-tauri/src/lib.rs` | `Option<ReindexEngine>` |
| Watcher único | `src-tauri/src/watcher/mod.rs` | `RecommendedWatcher` + debounce 300 ms; emite `workspace://change`; **não** chama `reindex_file` |
| Start/stop | `start_watching` / `stop_watching` no mesmo módulo | Um watch ativo por vez (`WatcherHub`) |

### 2.3 Frontend

| Símbolo | Path real | Papel |
|---|---|---|
| Tipos wiki | `src/types/metadata.ts` | `WikiLink`, `WikiLinkStatus`, `ResolvedWikiLink` (camelCase) |
| IPC wiki | `src/lib/ipc/metadata.ts` | Wrappers `getWikiLinksFor` / `resolveWikiLink` / `getResolvedWikiLinksFor` |
| Hook metadata | `src/hooks/useMetadata.ts` | Recarrega outgoing ao trocar `currentPath` |
| Painel outgoing | `src/components/wiki/OutgoingLinksPanel.tsx` | Seção "Links" no painel direito |
| Criar nota unresolved | `src/components/wiki/CreateNoteFromWiki.tsx` | Após criar, chama `triggerReindex` |
| Autocomplete `[[` | `src/editor/wiki/wiki-completion.ts` | CodeMirror 6 |
| Preview wiki | `src/markdown/plugins/wiki-links.ts` + `src/markdown/processor.ts` | Classes `wiki-link is-resolved\|unresolved\|ambiguous` |
| Viewer | `src/components/MarkdownViewer.tsx` | Clique abre path ou dispara unresolved |
| Painel direito | `src/App.tsx` (~L528–566) + `src/components/layout/ResizablePanel.tsx` | Outline + OutgoingLinks + Settings + Diagnósticos. **Sem sidebar extra** |
| Outline | `src/components/DocumentOutline.tsx` | Irmão do futuro painel Backlinks |
| go-to-line | `src/state/editor.ts` `goToLine` + `src/components/editor/GoToLine.tsx` + handler em `src/components/MarkdownEditor.tsx` (L148–157) | Line base 1; `scrollIntoView`; **sem highlight temporário hoje** |
| Abrir relativo | `src/state/documentState.ts` `openRelative` | Path fence; atualiza `recentFilesStore` |
| Recentes | `src/state/recent-files.ts` + `src/hooks/useRecentFiles.ts` | Persistido em `localStorage` |
| Watch FE | `src/lib/ipc/client.ts` `subscribeWorkspaceWatch` + `documentState.ts` (~L349–377) | Conflito se o arquivo aberto está dirty; **não** reindexa metadata |
| Eventos in-process | `src/services/workspaceEvents.ts` | Fan-out local; não é watcher de FS |

### 2.4 Testes Onda 2 (regressão obrigatória)

| Suite | Path |
|---|---|
| Resolve Rust | `src-tauri/crates/md-studio-core/src/index/wiki_resolve.rs` (`#[cfg(test)]`) |
| Parser Rust | `src-tauri/crates/md-studio-core/src/parser/wiki_link_parser.rs` (`#[cfg(test)]`) |
| Reindex | `src-tauri/crates/md-studio-core/src/index/reindex_engine.rs` (`#[cfg(test)]`) |
| Metadata FE | `tests/foundation/metadata.test.ts` |
| Completion | `tests/wiki/wiki-completion.test.ts` |
| Criar nota | `tests/wiki/create-note.test.ts` |
| Preview HTML | `tests/markdown/core/processor.test.ts` |
| goToLine store | `tests/ux/editorStore.test.ts` |

---

## 3. Decisões fechadas (WBS §5)

Todas vigentes. Impl posterior não reabre.

1. **Resolved only.** Só `WikiLinkStatus::Resolved` entra no índice reverso. `Unresolved` e `Ambiguous` ficam de fora. Não há status `collision`.
2. **Sem `column`.** Navegação pública é `line` (inteiro, **base 1**). Não adicionar campo `column` em tipos, IPC, UI ou testes.
3. **Contexto read-on-demand.** O índice **não** armazena texto. `context: Option<String>` é preenchido na leitura IPC. Falha de I/O, fence ou linha ausente → `null`; a ocorrência **permanece**.
4. **Self-links excluídos** do resultado público e do store do índice. Ver §5.1.
5. **Sem persistência própria** do `BacklinkIndex`. Derivado do `MetadataIndex` em memória. `.mdstudio/index.json` continua sendo só metadata.
6. **Reusar ReindexEngine / save / watcher.** Proibido segundo `RecommendedWatcher`, segundo debounce e segundo pipeline de scan.
7. **Fora da v1 desta onda:** grafo / Knowledge Graph, analytics, rename cascade, HTTP, markdown links clássicos `[texto](url.md)`, compatibilidade Obsidian completa.
8. **Norma de produto (já em `MD-BACKLINK-000`):** backlinks de Wiki Links internos entram na v1; grafo fica na Onda 4. Não reeditar `PROJETO.md` / G01 nesta tarefa.

### 3.1 Self-link

Self-link = o path resolvido do wiki link, normalizado, é o mesmo path relativo do documento fonte.

Normalização: `/` (não `\`), sem `./` inicial, comparação exata após resolve (o resolve já é case-sensitive no path exato).

Detectar **antes** de inserir no store público. Não aparece em `backlinks_for` nem no IPC.

### 3.2 Ordenação pública (estável)

Aplicada em `backlinks_for` / `get_backlinks`, não na UI.

1. **Grupos** por documento fonte: title CI (`DocumentMetadata.title`; `None` conta como `""`), desempate pelo path relativo POSIX.
2. **Ocorrências** dentro do grupo: line ASC (`line` crescente, base 1).
3. Contagens: `documentCount` = número de grupos; `occurrenceCount` = soma das ocorrências. São quantidades distintas.

---

## 4. Tipos canônicos (WBS §9)

Serde / JSON: `rename_all = "camelCase"`, igual a `WikiLink` e `ResolvedWikiLink`.
IPC e TypeScript usam camelCase. Rust interno pode usar snake_case nos campos.

Não incluir `column`, `status`, `graph`, `weight` nem `collision`.

### 4.1 Rust (`md-studio-core`, a criar em 002)

```rust
pub struct BacklinkOccurrence {
    pub source_path: PathBuf,
    pub line: usize,              // base 1
    pub context: Option<String>,  // sempre None no índice; Some/None só no IPC
}

pub struct BacklinkGroup {
    pub source_path: PathBuf,
    pub source_title: Option<String>,
    pub occurrences: Vec<BacklinkOccurrence>,
}

pub struct BacklinkResult {
    pub target_path: PathBuf,
    pub document_count: usize,
    pub occurrence_count: usize,
    pub groups: Vec<BacklinkGroup>,
}

pub struct BacklinkIndex { /* derivado; não Serialize em disco */ }

impl BacklinkIndex {
    pub fn new() -> Self;
    pub fn rebuild(&mut self, index: &MetadataIndex);
    pub fn backlinks_for(&self, target: &Path, meta: &MetadataIndex) -> BacklinkResult;
    pub fn replace_source(&mut self, source: &Path, index: &MetadataIndex); // idempotente
    pub fn remove_source(&mut self, source: &Path);
}
```

`backlinks_for` devolve grupos **sem** `context` (todos `None`). O comando IPC preenche contexto.

Resultado vazio é válido: `documentCount = 0`, `occurrenceCount = 0`, `groups = []`.

### 4.2 TypeScript (estender `src/types/metadata.ts` em 004)

```ts
export interface BacklinkOccurrence {
  sourcePath: string;
  line: number;            // base 1
  context: string | null;  // null não remove a ocorrência
}

export interface BacklinkGroup {
  sourcePath: string;
  sourceTitle: string | null;
  occurrences: BacklinkOccurrence[];
}

export interface BacklinkResult {
  targetPath: string;
  documentCount: number;
  occurrenceCount: number;
  groups: BacklinkGroup[];
}
```

Não criar `src/types/backlinks.ts` paralelo.

---

## 5. Índice reverso (002)

Arquivo novo **único** no core:

- `src-tauri/crates/md-studio-core/src/index/backlink_index.rs`
- export em `index/mod.rs` e `lib.rs`

Proibido: segundo crate, segundo `MetadataIndex`, copiar regras de `wiki_resolve.rs`.

Algoritmo de `rebuild` / `replace_source`:

1. Obter `DocumentMetadata` do fonte.
2. `index.resolve_all(document)` — reusar Onda 2.
3. Manter somente `status == Resolved` com `path = Some`.
4. Descartar Unresolved, Ambiguous, target inseguro e self-link.
5. Guardar aresta `(target_path, source_path, line)`. Alias não entra no índice (só display no outgoing).
6. `replace_source` remove **todas** as arestas antigas daquele fonte **antes** de inserir. Idempotente sob save repetido.

`remove_source`: apaga arestas cujo `source_path` é o arquivo removido.

Não persistir o mapa reverso. Após `load_index` / `full_reindex`, `rebuild` a partir do metadata carregado.

Testes Rust mínimos (002): alias ignorado; ambiguous fora; unresolved fora; unicode no target; empty workspace; idempotência de `replace_source`; self-link descartado; path fence via integração já existente do resolve.

---

## 6. Incremental (003) — hooks existentes

Pendurar `replace_source` / `remove_source` **depois** de o metadata atualizar. Não bloquear save. Logar erro; sem panic.

| Gatilho existente | Onde | Ação de backlink |
|---|---|---|
| Abrir workspace / load | `commands/mod.rs` `open_workspace` | `rebuild` após load ou `full_reindex` |
| Rebuild explícito | `commands/metadata.rs` `trigger_reindex` | `rebuild` após `full_reindex` |
| Save | `commands/mod.rs` `save_document` (já chama `reindex_file`) | `replace_source` do path salvo |
| `reindex_file` | `reindex_engine.rs` | ponto preferencial: após `index.insert` |
| `remove_file` | `reindex_engine.rs` | `remove_source` |
| Criar nota unresolved | `CreateNoteFromWiki.tsx` → `triggerReindex` | coberto pelo rebuild do trigger |
| Watcher FS | `src-tauri/src/watcher/mod.rs` | **hoje só emite evento**. 003 deve estender **este** watcher ou o subscribe já existente para chamar `reindex_file`/`remove_file` (e daí o backlink). Proibido novo `RecommendedWatcher` |

Fato do mapa: `subscribeWorkspaceWatch` em `documentState.ts` trata conflito de dirty e **não** reindexa. 003 fecha esse buraco no gancho existente, sem segundo pipeline.

Erro de backlink não reverte save. Multi-save do mesmo arquivo não duplica arestas.

---

## 7. IPC (004)

Comando novo, na superfície wiki já existente:

- Rust: `get_backlinks` em `src-tauri/src/commands/metadata.rs`
- Registro: `src-tauri/src/lib.rs` `invoke_handler`
- FE: `getBacklinks(path)` em `src/lib/ipc/metadata.ts`
- Hook: estender `src/hooks/useMetadata.ts` (refresh ao trocar documento). Não criar stack IPC paralela.

Contrato do comando:

- Entrada: path relativo do documento **alvo** (o arquivo aberto / “quem aponta para mim”).
- Path fence idêntico a `read_document` / `find_document`: relativo ao workspace; rejeitar absoluto, `..`, symlink de saída.
- Path fora do workspace → erro (`Err(String)`), não resultado vazio fingido.
- Workspace ausente → resultado vazio (mesmo padrão de `get_resolved_wiki_links_for`).
- Após `backlinks_for`, para cada ocorrência ler só a linha `line` do fonte indexado. Sucesso → `context = Some(texto da linha, trim)`. Falha → `context = None`; ocorrência permanece.
- Sem endpoint `get_backlinks_summary`: `BacklinkResult` já traz contagens.
- Ambiguous/Unresolved nunca aparecem. Empty é válido.

---

## 8. UI (005)

- Componente: `src/components/wiki/BacklinksPanel.tsx` (irmão de `OutgoingLinksPanel.tsx`).
- Hospedar no painel direito atual em `src/App.tsx`, junto de `DocumentOutline` e `OutgoingLinksPanel`.
- Sem segunda sidebar, sem coluna nova de layout, sem window Tauri extra.
- Header: `N documentos · M referências` (usar as duas contagens).
- Grupos por fonte: título ou basename; lista `line` + `context`.
- `context === null` não quebra o item (mostrar só a linha).
- Ordenação = backend; UI não reordena.
- Estados: loading / empty / error+retry; colapso do painel 0C (`rightCollapsed`); temas dark/light; `Button` compartilhado (`src/components/ui/Button.tsx`).
- Estilos: reusar `src/styles/wiki-links.css` e/ou token de painel existente; não criar design system paralelo.

---

## 9. Navegação (006)

Compor o que já existe. Sem segundo `goToLine`.

1. Clique numa ocorrência → `documentState.openRelative(sourcePath)` (fence + dirty policy + recentes).
2. Em seguida `editorStore.goToLine(line)` (base 1, já usado pelo diálogo Ir para linha).
3. Highlight temporário da linha no CodeMirror: estender o handler em `MarkdownEditor.tsx`; não novo editor.
4. Arquivo ausente / path inválido → erro seguro (diagnóstico existente); não crash.
5. Sem `column`. Split source/preview permanece o `view` atual.

---

## 10. A11y (007)

- Navegação só teclado nos grupos e ocorrências.
- `aria-selected` / `aria-expanded` nos grupos.
- Foco visível; contagens em texto (não só cor).
- Singular/plural em português.
- Tokens de tema; sem cor como único sinal.

---

## 11. Fora / proibido (todas as tasks 002–008)

- Knowledge Graph, canvas, analytics, pagerank.
- Segundo watcher / segundo `ReindexEngine`.
- Enum `collision` ou campo `column`.
- Persistência `.mdstudio/backlinks.json` (ou equivalente).
- Alterar regras de `wiki_resolve.rs` / `resolve-rules.md`.
- Indexar markdown links clássicos.
- HTTP, sync, plugins JS.
- Self-links no painel.
- Commit misturando Onda 2 com código de backlinks (gate 000 já fechado).

---

## 12. Aceite desta spec (001)

- [x] Paths reais mapeados (tabelas §2).
- [x] Todas as decisões fechadas da WBS 3.1 escritas (§3).
- [x] Tipos Rust/TS alinhados (§4).
- [x] Nenhum módulo de implementação criado nesta task — só este contrato.

**Verify:** `md_backlink_001_contract_pass`
