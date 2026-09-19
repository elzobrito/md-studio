# WBS-ONDA-2-WIKI-LINKS v1.0

## MD Studio — Wiki Links (produto sobre a Knowledge Foundation)

Versão: 1.0  
Status: PRONTA PARA ESAA  
Pré-requisito: Onda 1 Foundation **done** (`MD-FOUNDATION-001`…`010`)  
Repo: `/home/elzobrito/desenvolvimento/md-studio`

---

## 0. Contexto e limites (ler antes de codar)

### Já existe (Onda 1) — NÃO reinventar
- Parser `[[Target]]` / `[[Target|Alias]]` em `src-tauri/crates/md-studio-core/src/parser/wiki_link_parser.rs`
- `WikiLink { target, alias, line }` em `document_metadata.rs`
- Índice + reindex + IPC: `get_wiki_links_for`, `get_all_documents`, `get_document_metadata`, `get_workspace_stats`, `get_tags`, `trigger_reindex`
- FE: `src/types/metadata.ts`, `src/lib/ipc/metadata.ts`, `src/hooks/useMetadata.ts`

### Ainda NÃO existe (esta onda)
- Resolução target → path (resolved / unresolved)
- Render de `[[…]]` no preview como link navegável
- Clique no preview abre o `.md` (ou oferece criar)
- Autocomplete no editor ao digitar `[[`
- Painel de **links de saída** do documento atual
- Criar nota a partir de target unresolved

### Explicitamente FORA (v1 / G01 / PROJETO.md)
- Backlinks UI estilo Obsidian
- Grafo de documentos
- Compatibilidade Obsidian completa
- Sync / cloud / plugins JS

---

## 1. Objetivo

Tornar wiki links **úteis no dia a dia**: o usuário escreve `[[Nota]]`, vê no preview, navega, completa com `[[`, e cria a nota se ainda não existir — tudo local, no workspace já indexado.

Done = X com evidência Y (verify ids abaixo).

---

## 2. Tasks agregadas (8)

| ID | Título | Depende | Verify |
|----|--------|---------|--------|
| MD-WIKI-001 | Resolve engine (índice → path) | — | wiki_resolve_engine_pass |
| MD-WIKI-002 | IPC resolve + tipos FE enriquecidos | 001 | wiki_resolve_ipc_pass |
| MD-WIKI-003 | Preview: remark/rehype `[[wiki]]` → HTML | 002 | wiki_preview_render_pass |
| MD-WIKI-004 | Navegação no preview (abrir / unresolved) | 003 | wiki_preview_nav_pass |
| MD-WIKI-005 | Autocomplete `[[` no CodeMirror | 002 | wiki_editor_autocomplete_pass |
| MD-WIKI-006 | Painel outgoing links (doc atual) | 002 | wiki_outgoing_panel_pass |
| MD-WIKI-007 | Criar nota a partir de unresolved | 004,005 | wiki_create_from_link_pass |
| MD-WIKI-008 | QA Onda 2 + regressão 0B/0C/1 | 001–007 | onda_2_wiki_links_complete |

Ordem sugerida: 001 → 002 → (003∥005∥006) → 004 → 007 → 008.

---

## 3. Paths reais (âncora)

```
Core:   src-tauri/crates/md-studio-core/src/index/
        src-tauri/crates/md-studio-core/src/parser/wiki_link_parser.rs
App:    src-tauri/src/commands/metadata.rs
FE IPC: src/lib/ipc/metadata.ts
Types:  src/types/metadata.ts
Hook:   src/hooks/useMetadata.ts
MD:     src/markdown/processor.ts (+ plugins/)
View:   src/components/MarkdownViewer.tsx
Editor: CodeMirror em src/components/ (MarkdownEditor / editor/)
UI:     src/components/ (painel ao lado do outline ou seção no right panel)
```

Confirmar nomes com `rg`/`find` antes de criar arquivos paralelos.

---

## 4. Critério de encerramento

```
[ ] Target resolve por path relativo, stem e título (regras documentadas)
[ ] Preview mostra [[x]] clicável; unresolved com estilo distinto
[ ] Clique abre doc resolvido; unresolved oferece criar
[ ] Autocomplete [[ com candidatos do índice
[ ] Painel lista outgoing do doc atual (resolved/unresolved)
[ ] Criar nota gera .md no workspace + reindex + abre
[ ] Sem grafo / sem backlinks UI
[ ] vitest + testes Rust relevantes verdes; sem regressão 0B/0C/Foundation
```

Verify final: `onda_2_wiki_links_complete`
