# Onda 3 — Backlinks v3.1 | MD-BACKLINK-002
**Executor externo.** Claim → implement → prove → complete.
**WBS:** `docs/onda3/WBS-ONDA-3-BACKLINKS-v3.1.md`
**Repo:** `/home/elzobrito/desenvolvimento/md-studio`
**Proibido:** grafo, segundo watcher, status `collision`, campo `column`, persistência própria do índice, alterar Onda 2 resolver.

## Regras globais
1. Confirmar paths com `rg`/`find` (OutgoingLinksPanel, wiki_resolve, ReindexEngine).
2. Só indexar `Resolved`; excluir self-links; Ambiguous/Unresolved fora.
3. Contexto sob demanda; falha → context null.
4. Não misturar commit Onda 2 com código de backlinks.
5. Done = AC + verify + evidência quando aplicável.


## Objetivo
Reverse Link Index no core Rust; só Resolved; sem armazenar context.

## Depende
MD-BACKLINK-001

## Trabalho
1. `BacklinkIndex` com rebuild, backlinks_for, replace_source (idempotente), remove_source.
2. Reusar `MetadataIndex::resolve_*` — não duplicar regras.
3. Self-link detectado e descartado antes do store público.
4. Testes Rust listados no WBS (alias, ambiguous, unresolved, unicode, empty, idempotência, path fence via integração existente).

## AC
- [ ] Só Resolved indexado; self-links fora
- [ ] replace_source remove arestas antigas antes de inserir
- [ ] Sem column / sem collision enum
- [ ] Testes Rust verdes

**Verify:** `md_backlink_002_index_pass`
