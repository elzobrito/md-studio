# Onda 3 — Backlinks v3.1 | MD-BACKLINK-007
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
A11y + consistência visual.

## Depende
MD-BACKLINK-005, MD-BACKLINK-006

## Trabalho
Tabs/grupos/ocorrências com teclado, aria-selected/expanded, foco visível, contagens em texto, tokens tema, singular/plural.

## AC
- [ ] Navegação só teclado
- [ ] Nomes acessíveis conforme WBS
- [ ] Dark/light + design system

**Verify:** `md_backlink_007_ux_pass`
