# Referência de baseline pós-0.5.1

Esta nota prepara a próxima reconciliação do grafo TCG. Não reancora `graph.json` e não altera `source_commit`.

## Git

| Papel | SHA |
|---|---|
| Commit de consolidação, HEAD local | `b5e2cab8df4c9de9e3b620a094b615403c9cc097` |
| `origin/main`, sem push | `6dfd99840a9a87f79bc6eb8acf089bdeca374190` |

Mensagem do HEAD: `chore(esaa): consolidar hotfixes de interface pós-0.5.1`. Versão de produto: 0.5.1.

## Grafo

| Campo | Valor no `graph.json` deste HEAD |
|---|---|
| `source_commit` | `2e5cce855888b404654002fef1d97ebc0db29cf7` |
| `generated_at` | `2026-09-29T01:47:36-03:00` |

`validation.yaml` commitado junto ainda descreve `head: 6dfd99840a9a87f79bc6eb8acf089bdeca374190`, status `pass`, 0 críticos, 27 warnings. Esse relatório é anterior ao commit `b5e2cab`. O drift entre `source_commit` e o HEAD cresceu por esse commit: ele inclui `src/App.tsx`, estilos de layout, splash Rust e testes que o grafo ancorado em `2e5cce8` não cobre como mudança nova.

Não rode `build_graph.py` em cima desta árvore para “atualizar a data”. A próxima tarefa de reconciliação deve partir de `b5e2cab` limpo de resíduo de governança, gerar um snapshot do grafo atual e só então reancorar.

## Resíduo depois do commit

O event store continua depois de `b5e2cab` (complete e review da consolidação, mais esta tarefa). Por isso `.roadmap/activity.jsonl`, `issues.json`, `lessons.json` e `roadmap.json` ficam modificados. Também ficam fora do commit:

- `docs/qa/post051/MD-POST051-GIT-CONSOLIDATE-001.md`
- `.esaa/analysis/MD-POST051-GIT-CONSOLIDATE-001-footprint.yaml`
- `.esaa/analysis/MD-POST051-GIT-CONSOLIDATE-001-drift.yaml`
- os artefatos desta tarefa de fechamento
- `scripts/rebuild-test.sh`, `scripts/rebuild-test-fixed.sh`, `scripts/esaa-hotfix-workspace-containment.sh`

As 399 tarefas históricas seguem `done`. `esaa verify` estava ok no evento 4971, antes do complete deste fechamento.
