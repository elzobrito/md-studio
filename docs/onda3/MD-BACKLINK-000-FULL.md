# Onda 3 — Backlinks v3.1 | MD-BACKLINK-000
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
Emendar norma v1 e consolidar Onda 2 no Git. **Bloqueante** — sem isto, 001+ não elegíveis.

## Trabalho
1. Emendar `PROJETO.md`: backlinks de Wiki Links internos **entram** na v1; Knowledge Graph **fora** da v1 (Onda 4).
2. Emendar `docs/spec/G01-contrato-do-produto-e-conjunto-de-prds.md` com a mesma decisão (remover backlinks da lista de exclusões da v1; manter grafo excluído).
3. Revisar working tree da Onda 2; incluir `docs/qa/onda2-wiki-links.md` se ainda não commitado.
4. Commit **exclusivo** Onda 2 (não misturar backlinks). Push conforme política do repo.
5. Registrar hash do commit em `docs/onda3/onda2-commit-gate.md`.
6. `git status` pós-consolidação documentado.

## Fora
Implementar backlinks; mudar comportamento wiki.

## AC
- [ ] PROJETO + G01 coerentes (backlinks in, grafo out)
- [ ] Onda 2 em commit próprio; hash registrado
- [ ] Sem código de backlink neste commit
- [ ] Status inspecionado antes da 001

**Verify:** `md_backlink_000_governance_pass`
