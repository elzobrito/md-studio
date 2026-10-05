# MD-CI-RUNNER-HOSTED-001 — falha de aquisição de runner hosted

## Sintoma

Os três workflows (`ci`, `Build Linux App`, `Build Windows App`) falharam no job reusable `security / security` em ~15m3s. O job `build-*` ficou `skipped` (0s). Nenhum step de teste/build rodou.

Mensagens (iguais nos três):

- `The job was not acquired by Runner of type hosted even after multiple attempts`
- `Internal server error` com Correlation ID
- aviso: `ubuntu-latest` migra para Ubuntu 26 em 2026-10-19

## Evidência de que não é regressão de produto

`ci` no SHA `c6884de` (release 0.5.2) passou: run 37365464183, 20m12s.

O job falho no closeout `6cfa2ba` (Linux 37366747219) concluiu `security / security` como `cancelled` após espera, `build-linux` `skipped`.

Correlation IDs nos prints:

| Workflow | SHA | Correlation ID |
|---|---|---|
| Build Linux App | `6cfa2ba` | `d670d086-abeb-450a-a47b-ea7bde17ce4c` |
| Build Windows App | `6cfa2ba` | `fc0b05f3-ddbf-4720-9aed-7dbd604abc1b` |
| ci | `6cfa2ba` | `cd7122db-07e5-4502-9fc7-3da6c5e1c5ee` |

Causa: stampede GitHub-hosted (push `main` + tag `v0.5.2` = 6 workflows; closeout +3). `ci.yml` disparava em qualquer `push`, inclusive tags.

## Correção

- `runs-on: ubuntu-24.04` em `security-gates.yml`, `ci.yml` e `build-linux.yml`
- `concurrency.group: ${{ github.workflow }}-${{ github.ref }}` nos três workflows; `cancel-in-progress` só em PR
- `ci.yml` `on.push.branches: [main]` (tags usam linux/windows, que já chamam security)

Windows permanece `windows-latest`.

GitHub Release da tag `v0.5.2` fica em `workflow_dispatch` com `release_tag=v0.5.2` depois deste SHA, para usar o YAML novo.
