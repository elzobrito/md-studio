# Onda 3 — Backlinks v3.1 | MD-BACKLINK-004
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
IPC `get_backlinks` + contexto sob demanda + tipos/hook FE.

## Depende
MD-BACKLINK-002, MD-BACKLINK-003

## Trabalho
1. Comando tipado; path fence no target.
2. Enriquecer context lendo só lines dos sources indexados; falha → null.
3. TS interfaces conforme WBS; hook atualiza ao trocar doc.
4. Sem endpoint summary redundante se BacklinkResult já traz contagens.
5. Testes IPC / mocks.

## AC
- [ ] camelCase; empty válido; Ambiguous ausente
- [ ] context on-demand; null não remove ocorrência
- [ ] path fora do workspace rejeitado
- [ ] Hook FE ok

**Verify:** `md_backlink_004_ipc_pass`
