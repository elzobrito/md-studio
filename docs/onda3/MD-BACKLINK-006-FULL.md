# Onda 3 — Backlinks v3.1 | MD-BACKLINK-006
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
Clique → abrir source + go-to-line (base 1) + highlight temporário + recent files.

## Depende
MD-BACKLINK-005

## Trabalho
1. Compor open-file + go-to-line **existentes** — sem segunda implementação.
2. Path fence; arquivo ausente → erro seguro; dirty policy existente.
3. Sem column.

## AC
- [ ] Line correta; highlight temporário
- [ ] Recent files atualizado
- [ ] Ausente/inválido tratados
- [ ] Source e split ok

**Verify:** `md_backlink_006_navigation_pass`
