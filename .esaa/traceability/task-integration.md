# Integração do grafo de rastreabilidade com tarefas ESAA (TRACE-016)

- source_commit do grafo: `5fe4f4d2230f039791d6196cb0f0ecfb438825ae`
- gerado em: 2026-09-24 23:55 BRT
- depende de: `impact-model.yaml` (TRACE-014), `blast-radius-model.yaml` (TRACE-015)

## 1. Bloco `traceability`

Uma tarefa que altera código declara **ids do grafo** (nunca caminhos soltos) e a política de mudança:

```yaml
traceability:
  targets: [<id do grafo>, ...]          # change_target (obrigatório, ids de graph.json)
  expected_affected: [<id>, ...]         # opcional; se ausente, derivado (blast-radius-model.yaml)
  protected_extra: [<id>, ...]           # opcional; protege além do conjunto global
  change_policy:
    mode: surgical                       # surgical | broad
    allow_new_tests: true                # arquivos de teste novos = info, não drift
    allow_new_production_nodes: false    # símbolo de produção novo = warning uncatalogued_change
  justification:                         # obrigatório se algum id declarado estiver em protected
    <id>: "<por que a tarefa precisa tocar este nó protegido>"
```

Semântica: `authorized = targets ∪ expected_affected`. A classificação do que foi alterado
(ok / warning / violation) segue `blast-radius-model.yaml`.

## 2. Compatibilidade com o schema ESAA (verificado)

O schema de tarefa do ESAA (`.roadmap/roadmap.schema.json` e o template em
`esaa/templates/roadmap.schema.json`, `$defs/task`) tem `additionalProperties: false`.
Campos aceitos: acceptance_criteria, assigned_to, baseline_id, boundary_grant, completed_at,
depends_on, description, fixes, immutability, is_hotfix, issue_id, outputs, plugin,
required_review_mode, required_verification, scope_patch, started_at, status, superseded_by,
supersedes, targets, task_id, task_kind, task_type, title, verification.

Teste executado no Nitro em 2026-09-24 23:15 BRT, só em memória, sem gravar nada em `.roadmap/`:
a tarefa TRACE-014 copiada valida contra `$defs/task`. Com
`traceability: {targets: [HDL-DOC-RESOLVE-CONFLICT], change_policy: {mode: surgical}}` acrescentado, o jsonschema rejeita:

```
REJECTED: Additional properties are not allowed ('traceability' was unexpected) | path ['additionalProperties']
```

Além disso, `esaa task create` não expõe flag para campos extras. Por isso o bloco
**não** vai para `roadmap.json` (evita quebrar o schema e o `esaa verify`, e não mexe no event store).

## 3. Decisão: sidecar por tarefa

O bloco fica num arquivo **sidecar** `.esaa/tasks/<task-id>.yaml`. A tarefa e o sidecar são ligados pelo `task_id`.

A tarefa ESAA referencia o sidecar só com campos válidos:

- `targets` recebe o caminho `.esaa/tasks/<task-id>.yaml`, além dos arquivos da tarefa. No ESAA,
  `targets` é uma lista livre de strings, usada apenas para casar o escopo das lições
  (`dispatch._lesson_matches_scope`), então incluir o sidecar é inofensivo.
- um critério de aceite: `"traceability: ver .esaa/tasks/<task-id>.yaml; drift sem violation"`.
- `boundary_grant` precisa incluir `.esaa/tasks/<task-id>.yaml` e `.esaa/analysis/**`.

Formato do sidecar:

```yaml
artifact: task-traceability
schema_version: 1
task_id: <task-id ESAA>
graph:
  path: .esaa/traceability/graph.json
  source_commit: <sha do grafo usado na projeção>
traceability: { ...bloco da seção 1... }
artifacts:                       # preenchidos ao longo da tarefa
  impact: .esaa/analysis/<task-id>-impact.yaml       # antes de tocar código (TRACE-017)
  footprint: .esaa/analysis/<task-id>-footprint.yaml # após a mudança (TRACE-018)
  drift: .esaa/analysis/<task-id>-drift.yaml         # classificação (TRACE-019)
```

Validação mínima (manual/ferramenta): todo id em `targets`, `expected_affected` e `protected_extra`
existe em `graph.json`. Para conferir, `python .esaa/traceability/tools/impact.py blast --spec .esaa/tasks/<id>.yaml`
aborta em id desconhecido.

## 4. Ciclo de vida

1. **Criar a tarefa ESAA** (`esaa task create …`) com o sidecar em `targets`/`boundary_grant` e o critério de aceite.
2. **Escrever o sidecar** com `targets` (ids) e `change_policy` antes de qualquer código.
3. **Projetar**: `impact.py blast --spec .esaa/tasks/<id>.yaml` → `.esaa/analysis/<id>-impact.yaml`
   (registrar `projected_before_change: true` e o horário).
4. **Implementar** e só depois
5. **Footprint**: `footprint.py` intersecta os hunks do diff com as âncoras → `<id>-footprint.yaml`.
6. **Drift**: `drift.py` classifica observado × autorizado → `<id>-drift.yaml`. Uma violation bloqueia o
   fechamento da tarefa ou exige justificativa e re-declaração, com nova projeção versionada.
7. **Fechar a tarefa** no ESAA (complete → review → verify). O sidecar e os artefatos ficam como evidência.

## 5. Exemplo (ilustrativo)

`.esaa/tasks/MD-EXEMPLO-CONFLICT-001.yaml`, um exemplo que não foi gravado como tarefa. O caso real está em TRACE-020(b):

```yaml
artifact: task-traceability
schema_version: 1
task_id: MD-EXEMPLO-CONFLICT-001
graph: {path: .esaa/traceability/graph.json, source_commit: 5fe4f4d2230f039791d6196cb0f0ecfb438825ae}
traceability:
  targets: [HDL-DOC-RESOLVE-CONFLICT]
  expected_affected: [STO-DOCUMENT-STATE, TST-TS-EDITOR-AUTOSAVE]
  protected_extra: []
  change_policy: {mode: surgical, allow_new_tests: true, allow_new_production_nodes: false}
artifacts:
  impact: .esaa/analysis/MD-EXEMPLO-CONFLICT-001-impact.yaml
```

Tarefa ESAA correspondente, com os campos válidos:

```
python -m esaa --root . task create MD-EXEMPLO-CONFLICT-001 --kind impl --task-type hotfix \
  --required-review-mode regression \
  --target src/state/documentState.ts --target .esaa/tasks/MD-EXEMPLO-CONFLICT-001.yaml \
  --boundary-grant 'src/state/documentState.ts' --boundary-grant 'tests/**' \
  --boundary-grant '.esaa/tasks/MD-EXEMPLO-CONFLICT-001.yaml' --boundary-grant '.esaa/analysis/**' \
  --acceptance-criterion 'traceability: ver .esaa/tasks/MD-EXEMPLO-CONFLICT-001.yaml; drift sem violation'
```

Projeção obtida com `impact.py blast --targets HDL-DOC-RESOLVE-CONFLICT`:

- authorized = {HDL-DOC-RESOLVE-CONFLICT, STO-DOCUMENT-STATE}
- potentially_affected = {BTN-CONFLICT-KEEP, BTN-CONFLICT-RELOAD, BTN-CONFLICT-SAVE-AS, SCR-APP}
- protected no fechamento = {CMP-CONFLICT-DIALOG (invariant_member:INV-SHA256-CONFLICT)}

## 6. Verify

O sidecar mora fora de `.roadmap/`, e nenhum campo novo entra em `roadmap.json`, então o `esaa verify`
não é afetado. A comprovação está nas notas de conclusão desta tarefa: verify ok após TRACE-016.
