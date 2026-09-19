# AGENTS.md — Contrato operacional ESAA

> Recorte estável para runners. Em divergência, os artefatos canônicos em `.roadmap/` prevalecem.
> O ESAA não usa MCP. Use a CLI ESAA: `python -m esaa`.

## Autoridade

ESAA é o protocolo de governança. O Orchestrator é o single writer do event store.
Agentes emitem intenções válidas; não editam diretamente `.roadmap/activity.jsonl`
nem os read models.

Fontes canônicas:
- Event store: `.roadmap/activity.jsonl`
- Projeções: `.roadmap/roadmap.json`, `.roadmap/issues.json`, `.roadmap/lessons.json`
- Contratos: `.roadmap/AGENT_CONTRACT.yaml`, `.roadmap/ORCHESTRATOR_CONTRACT.yaml`,
  `.roadmap/agent_result.schema.json`, `.roadmap/RUNTIME_POLICY.yaml`

## CLI

```bash
python -m esaa --root . verify
python -m esaa --root . eligible
python -m esaa --root . dispatch-context T-000
```

Comandos que escrevem eventos devem identificar o runner:

```bash
python -m esaa --root . --runner codex submit output.json --actor agent-spec
```

## Governança obrigatória (política do operador — 2026-07-10)

**Qualquer ação** que altere o produto, o repositório, build, pacotes instalados,
contratos de agentes ou estado operacional do workspace **deve ser governada
pelo ESAA-Core**.

Fluxo mínimo:

1. `task.create` (se ainda não houver tarefa elegível)
2. `claim` com `--runner <id>` e actor correto
3. executar o trabalho
4. `complete` com checks; `file_updates` (path+content) quando houver arquivos
5. `review` → `done`
6. `python -m esaa --root . verify`

Proibido:

- editar código, rebuild, reinstalar pacotes ou “corrigir por fora” sem `claim`
- `file_updates` incompletos (boundary: ampliar grant ou tarefa de auditoria)
- reabrir tarefa `done`

Ops (ex.: `apt install` de `.deb`) devem estar amarradas a tarefa
`release`/`hotfix` com checks e notas no `complete`.

Exceção somente com **autorização humana explícita** no turno.

Conversation ESAA (`decide`) registra decisões de handoff; **não substitui**
claim/complete do ESAA-Core.

## Regras para agentes

- Emita exatamente uma `activity_event` por output.
- Use JSON puro, sem markdown fora do envelope.
- Inclua `prior_status` em todo output e mantenha-o coerente com o contexto recebido.
- Use `file_updates` somente com `action=complete`.
- Não inclua campos gerados pelo Orchestrator, como `runner`, `actor`, `event_seq`, `ts` ou `assigned_to`.
- Nunca reabra nem modifique tarefa `done`; reporte `issue.report`.
- Na dúvida, falhe fechado com `issue.report` e evidência reproduzível.

## Ciclo

1. `todo` -> `claim`
2. `in_progress` atribuído ao seu actor -> `complete`
3. `review` -> somente QA autorizado emite `review`
4. `done` -> apenas `issue.report`

## Lessons baseline

- LES-0001: nunca colapsar `claim` + `complete`.
- LES-0002: `file_updates` sem `action=complete` é inválido.
- LES-0003: `prior_status` é obrigatório e coerente.
