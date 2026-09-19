# Onda 3 — Backlinks v3.1 | MD-BACKLINK-003
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
Pendurar BacklinkIndex em load/rebuild, reindex_file, save_document e watcher **existentes**.

## Depende
MD-BACKLINK-002

## Trabalho
1. Após metadata atualizar → `replace_source` / `remove_source`.
2. Criação de nota unresolved → atualiza relação.
3. Erro de backlink não bloqueia save; log sem panic.
4. Sem segundo watcher / segundo pipeline.
5. Testes: add/remove link+save, retarget A→B, create unresolved target, external delete, no dupes, rebuild≡incremental.

## AC
- [ ] Hooks reais usados
- [ ] Sem watcher duplicado
- [ ] Idempotente sob multi-save
- [ ] Testes incrementais verdes

**Verify:** `md_backlink_003_incremental_pass`
