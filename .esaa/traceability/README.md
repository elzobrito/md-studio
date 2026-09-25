# ESAA Software Traceability Graph — md-studio

Grafo de rastreabilidade semântica do md-studio: liga **features → entrypoints → handlers/serviços →
comandos IPC Rust → persistência/eventos → contratos → testes → invariantes**, com evidência verificável
no código. É um artefato de governança ESAA (roadmap `TRACE-*`), sem alteração de código da aplicação.

- `source_commit`: `8eb7b6e18a672b94199397f1cc0d0ec7def6609c` (v0.2.3 + fix MD-BUG-CONFLICT-RELOAD-001; grafo gerado em 5fe4f4d e re-ancorado pelo graph-delta)
- Contrato completo: [`schema.yaml`](schema.yaml)

## Artefatos

| Arquivo | Tarefa | Conteúdo |
|---|---|---|
| `repository.yaml` | TRACE-001 | inventário físico/lógico do repositório |
| `schema.yaml` | TRACE-000 | tipos de nó/relação, regras de ID, campos, inclusão, staleness, impacto autorizado |
| `modules.yaml` | TRACE-002 | bounded contexts `MOD-*` |
| `entrypoints.yaml` | TRACE-003 | entrypoints `ENT-*` (UI, atalhos, IPC, eventos, SO) |
| `nodes.yaml` / `edges.yaml` | TRACE-004..006, 010 | nós e arestas com âncora + evidência |
| `contracts.yaml` | TRACE-007 | contratos `CTR-*` (IPC, eventos, arquivos, localStorage, pipeline) |
| `features.yaml` | TRACE-008 | features `FEAT-*` |
| `flows/*.yaml` | TRACE-009 | fluxos ponta a ponta `FLOW-*` |
| `tests.yaml` | TRACE-010 | índice de testes → nós/features/invariantes |
| `invariants.yaml` | TRACE-011 | invariantes `INV-*` (com `gap: true` quando sem teste) |
| `graph.json` | TRACE-012 | grafo consolidado (derivado; não editar à mão) |
| `validation.yaml` | TRACE-013 | resultado da validação |
| `tools/` | 012/013 | `build_graph.py`, `validate.py` (somente stdlib + PyYAML) |

## Como regenerar

```bash
python .esaa/traceability/tools/build_graph.py      # YAML -> graph.json
python .esaa/traceability/tools/validate.py         # -> validation.yaml (exit 1 se houver crítico)
```

## Regras essenciais

1. **Nada inventado.** Todo nó tem `anchor {path, symbol, lines}` válido no `source_commit`; toda aresta tem
   `evidence` (`path:linha`) e `method: observed|inferred`. Inferências declaram `confidence`.
2. **IDs estáveis** `PREFIX-UPPER-KEBAB`; renomeação atualiza `anchor`/`alias`, nunca o id. Ids não são reutilizados.
3. **Fronteira IPC**: `IPCC-* --calls{boundary: ipc}--> IPC-*` exige evidência do `invoke('<cmd>')` em TS **e** do
   handler/registro Rust (`generate_handler!`).
4. **Staleness**: âncoras são verificadas com `git show <source_commit>:<path>`. Se `HEAD != source_commit`, nós em
   arquivos alterados são marcados `stale` (warning) até serem re-âncorados.
5. **Impacto autorizado** (fases 014–020): `authorized = change_target ∪ expected_affected`;
   alteração em `potentially_affected` fora de authorized = **warning**; em `protected` = **violation**.
6. Tipos genéricos não aplicáveis (`api_endpoint`, `database_table`, `database_column`) ficam declarados com
   `applicable: false`: o md-studio não tem HTTP nem banco; seus papéis são cobertos por `ipc_command`,
   `file_persisted` e `local_storage_key`.

## Extensões específicas do md-studio

`ipc_command`, `ipc_client`, `tauri_event`, `file_persisted`, `local_storage_key`, `store`, `shortcut`,
`pipeline_stage`, `os_integration`, `dto` — justificativas em `schema.yaml`.
