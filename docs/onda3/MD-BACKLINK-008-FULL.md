# Onda 3 — Backlinks v3.1 | MD-BACKLINK-008
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
QA + regressão Onda 2 + relatório `docs/qa/onda3-backlinks.md`.

## Depende
000–007

## Trabalho
1. Suites Rust/FE do WBS § MD-BACKLINK-008.
2. Regressão wiki Onda 2 completa.
3. pnpm test/typecheck/build + cargo tests + git diff --check.
4. Visual checklist; documentar limite se sem Tauri desktop interativo.
5. Confirmar: sem grafo.

## AC
- [ ] Todas 000–008 done
- [ ] Relatório QA criado; limites honestos
- [ ] verify ok; gate `onda_3_backlinks_v3_1_complete`

**Verify:** `md_backlink_008_qa_pass`
