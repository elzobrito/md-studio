# Onda 3 — Backlinks v3.1 | MD-BACKLINK-001
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
Mapear paths reais e congelar contrato em `docs/architecture/backlinks-contract.md`.

## Depende
MD-BACKLINK-000

## Trabalho
1. Mapear: WikiLink, WikiLinkStatus, wiki_resolve, MetadataIndex, ReindexEngine, save_document, watcher, IPC wiki, TS types/hooks, OutgoingLinksPanel, painel direito, go-to-line, testes Onda 2.
2. Contrato: Resolved only; Unresolved/Ambiguous out; self-link excluído; sem column; line base 1 pública; context Option + read-on-demand; sem persistência própria; ordenação grupos title CI / path, ocorrências line ASC; segundo watcher proibido.
3. Tipos Rust/TS alinhados ao WBS §9.

## AC
- [ ] Paths reais no contrato
- [ ] Todas decisões §5 do WBS 3.1 escritas
- [ ] Sem módulos paralelos criados nesta task

**Verify:** `md_backlink_001_contract_pass`
