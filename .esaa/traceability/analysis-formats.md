# Formatos dos artefatos de análise por tarefa (TRACE-017/018/019)

Diretório: `.esaa/analysis/`. Um conjunto de arquivos por tarefa ESAA:

| arquivo | quando | produzido por | tarefa |
|---|---|---|---|
| `<task-id>-impact.yaml` | **antes** de tocar código | `tools/impact.py project --spec <sidecar>` | TRACE-017 |
| `<task-id>-footprint.yaml` | depois da mudança | `tools/footprint.py` | TRACE-018 |
| `<task-id>-drift.yaml` | depois do footprint | `tools/drift.py` | TRACE-019 |

O spec de entrada é o sidecar da tarefa (`.esaa/tasks/<task-id>.yaml`, ver `task-integration.md`). Para
calibração retroativa de uma tarefa já concluída, o spec fica em `.esaa/analysis/<task-id>-traceability.yaml`.

## 1. `<task-id>-impact.yaml` (projeção — TRACE-017)

```yaml
artifact: task-impact
schema_version: 1
trace_task: TRACE-017
task_id: <id>
projected_at: <ISO-8601 com offset -03:00>
projected_before_change: true        # obrigatório true; senão a projeção não vale para métricas
projection_inputs: [...]             # o que foi usado (descrição da tarefa, grafo, buscas); o que NÃO foi usado
spec: <caminho do sidecar>
graph_source_commit: <sha>
rationale: {<id>: <por que o nó está no conjunto>}
justification: {<id protegido declarado>: <motivo>}
expected_uncatalogued: [<arquivos sem nó esperados: lockfiles, manifestos, testes novos>]
blast_radius:                        # blast-radius-model.yaml
  change_target: [id]
  expected_affected: [id]
  expected_affected_source: declared | derived
  suggested_expected_affected: [id]  # o que o modelo sugeriria sem declaração
  authorized: [id]                   # change_target ∪ expected_affected
  potentially_affected: [id]
  protected_in_closure: [{id, reasons}]
  protected_total: <n>               # tamanho do conjunto protected global (menos os declarados)
  protected_declared: [{id, reasons}]
  change_policy: {mode, allow_new_tests, allow_new_production_nodes}
projected:                           # visão resumida para humanos/QA
  nodes: [id]                        # = authorized
  features: {direct: [id], indirect: [id]}
  flows: [id]
  invariants: [{id, hit_by, tests}]
  tests: {must_run: [id], should_run: [id], may_run: [id]}
  contracts: [id]
  data: [id]
  events: [id]
  entrypoints: [id]
  modules: [id]
closure: [{id, kind, type, distance, anchor, via: {node, relation, direction}, terminal}]
hubs: [{id, relation, direction, fanout}]
stats: {closure_nodes, by_distance}
```

Regras:
- A projeção é gravada e o horário registrado antes de qualquer diff/código ser consultado. Na calibração retroativa,
  `git show/diff --stat` do commit só pode ser olhado depois que o arquivo existir.
- Os ids precisam existir no grafo; o `impact.py` aborta em id desconhecido.
- A projeção não é editada depois do footprint. Para corrigir, cria-se `<task-id>-impact.v2.yaml` com o motivo.

## 2. `<task-id>-footprint.yaml` (observado — TRACE-018)

Produzido por `tools/footprint.py` a partir de um diff **real**:

- commit(s): `--base <rev> --head <rev>`
- working tree: `--head WORKTREE --paths <arquivos da tarefa>`, com `--paths` obrigatório. `--exclude <conjunto de outra frente>` aborta
  se algum arquivo excluído aparecer no diff ou nos paths.

```yaml
artifact: task-footprint
schema_version: 1
trace_task: TRACE-018
task_id: <id>
diff: {base: <sha>, head: <sha|WORKTREE>, paths_filter: [..], excluded_set: [..], command: "git diff -U0 ..."}
graph_source_commit: <sha>
notes: [..]                         # exclusões e política de âncoras aplicada
changed_files:
  - {path, status: M|A|D|R, added, removed, hunks: [{old: [s,e], new: [s,e]}], is_test, catalogued_nodes_in_file}
changed_nodes:
  - id: <id>
    kind: code|test
    type: <tipo>
    path: <arquivo>
    sides: [old, new]               # em qual lado do diff as linhas caíram na âncora
    lines_hit: <n>
    attribution: line | file_level  # file_level = teste existente alterado fora de blocos TST
    anchor_resolution: {old: exact|relocated|partial|missing, new: ...}
    created_by_change: <bool>       # missing no base e presente no head
enclosing_nodes: [{id, contains_changed: [id]}]   # contêineres cujas linhas próprias não mudaram
uncatalogued:                       # linhas alteradas sem nó
  - {path, is_test, old_lines: [[s,e]], new_lines: [[s,e]], trivial_lines: <n>, substantive_lines: ["new:48", ...]}
new_files: [..]                     # arquivos de produção novos sem nó
new_test_files: [..]
contracts_touched: [{id, how: carrier|producer|consumer, node}]
data_touched: [{id, how: definition_changed|written_by_changed|read_by_changed, node}]
events_touched: [{id, how: definition_changed|published_by_changed|consumed_by_changed, node}]
rollup: {features: [..], invariants: [..], flows: [..]}
stats: {files, changed_nodes, code_nodes, test_nodes, uncatalogued_files, uncatalogued_substantive_lines, new_files, new_test_files}
```

Algoritmo:
1. `git diff -U0` e parse dos hunks, com linhas old e new por arquivo. Arquivos não rastreados em `--paths` entram como `A`.
2. Âncoras de `graph.json` são re-localizadas em cada revisão por alinhamento `difflib` entre o arquivo em
   `graph_source_commit` e o arquivo na revisão:
   - `exact`: mesmas linhas
   - `relocated`: ≥50% das linhas mapeadas
   - `partial`: <50% mapeadas
   - `missing`: nenhuma linha mapeada
   Isso permite analisar commits anteriores ao grafo com honestidade: um nó missing no base e presente no head significa `created_by_change`.
3. Atribuição por linha ao nó **mais interno** que a contém (menor span). O contêiner vai para `enclosing_nodes`
   e não conta como alterado se nenhuma linha própria mudou.
4. Em arquivo de teste existente, uma mudança fora de blocos TST é atribuída aos TST do arquivo (`file_level`) só quando
   nenhum TST do arquivo recebeu linha.
5. Linhas sem nó ficam em `uncatalogued` e são classificadas como `trivial` (branco, comentário, doc-comment, import/use)
   ou `substantive`. Só substantive vira warning `uncatalogued_change` no drift.
6. Contratos, dados e eventos tocados são derivados das arestas dos nós alterados: carrier implements CTR,
   producer (CTR implemented_by), consumer (depends_on CTR), writes/reads de data, publishes/consumes.

Arquivos de governança ESAA (`.roadmap/*`) são projeções do event store. Eles saem do `--paths` e isso é registrado em `notes`.

## 3. `<task-id>-drift.yaml` (classificação — TRACE-019)

Produzido por `tools/drift.py --impact <id>-impact.yaml --footprint <id>-footprint.yaml`.
Definição: **drift = observado − autorizado**, classificado pela regra de `blast-radius-model.yaml`.

```yaml
artifact: task-drift
schema_version: 1
trace_task: TRACE-019
task_id: <id>
inputs: {impact, footprint, graph_source_commit}
notes: [..]
rule: "..."
authorized: [id]
observed: [id]                        # changed_nodes do footprint (code + test)
classification:                       # um item por nó observado
  - {id, category: authorized|protected|potentially_affected|out_of_closure, severity: ok|violation|warning, reasons: [..]}
drift: [ ...itens de classification com category != authorized... ]
other_findings:
  - {path, category: uncatalogued_change, severity: warning|info, lines: [..]}   # só linhas substantive
  - {path, category: new_production_file|new_test_file, severity}
  - {id, category: created_production_node, severity, note}
not_touched: [id]                     # authorized − observed (info; reduz precisão)
verdict: ok | warning | violation     # o pior severity encontrado
metrics:
  nodes: {tp, authorized, observed, precision, recall, closure_recall}
  code_nodes_only: {tp, authorized, observed, precision, recall}
  features: {projected_direct, projected_all, observed, observed_in_projected_direct,
             observed_missing_from_projection, precision_direct, recall_all}
  invariants: {projected, observed, missing_from_projection}
  tests: {projected_must_run, changed_test_nodes, new_test_files}
  contracts_touched / data_touched / events_touched: (do footprint)
```

Precedência da classificação: authorized > protected > potentially_affected > out_of_closure.
- `protected` é recalculado do grafo (conjunto global do blast-radius-model) menos authorized.
- `precision = |obs ∩ auth| / |auth|`
- `recall = |obs ∩ auth| / |obs|`
- `closure_recall` mede se o fechamento, mesmo sem autorizar, continha o que mudou.
