# MD-CI-RUNNER-HOSTED-002 — security duplicado esgota o runner Ubuntu

## Sintoma após 001

O pin `ubuntu-24.04` e o `concurrency` por workflow (SHA `0e7ac80`) não fizeram os três workflows passarem. Cada um ainda disparava o reusable `security-gates.yml`, então três jobs Ubuntu hosted competiam e falhavam na aquisição (~15m).

| Workflow | Run | SHA | Conclusão |
|---|---|---|---|
| ci #84 | 37369720712 | `0e7ac80` | failure 15m5s |
| Build Linux App #25 | 37369720764 | `0e7ac80` | failure 15m4s |
| Build Windows App #40 | 37369720773 | `0e7ac80` | failure 15m5s |

`ci` no SHA `c6884de` (run 37365464183) já tinha passado: a falha continua sendo aquisição de runner, não teste de produto.

## Correção

- `build-linux.yml` e `build-windows.yml`: removidos o job `security` e `needs: security`. O gate permanece só em `ci.yml`.
- Windows pede `windows-latest` na hora, sem esperar Ubuntu.
- Linux pede um único job Ubuntu (`build-linux`), sem um terceiro clone de `security`.
- `concurrency.group: md-studio-hosted-${{ github.ref }}` nos três workflows, para serializar a demanda hosted na mesma ref. `cancel-in-progress` só em PR.

`security-gates.yml` e o job `build` de `ci.yml` continuam em `ubuntu-24.04`.
