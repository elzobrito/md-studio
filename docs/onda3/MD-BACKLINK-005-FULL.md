# Onda 3 — Backlinks v3.1 | MD-BACKLINK-005
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
Aba/seção Backlinks no painel direito (junto Sumário / Links). Sem sidebar nova.

## Depende
MD-BACKLINK-004

## Trabalho
1. Estender shell do painel que já hospeda OutgoingLinksPanel + DocumentOutline.
2. Header: `N documentos · M referências`; grupos por source; line + context.
3. Estados loading / empty / error+retry; colapso 0C; dark/light; Button compartilhado.
4. Ordenação = backend.

## AC
- [ ] Integrado ao painel direito
- [ ] Contagens distintas docs vs ocorrências
- [ ] context null não quebra
- [ ] Sem segunda sidebar

**Verify:** `md_backlink_005_panel_pass`
