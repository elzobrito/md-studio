# QA — MD-PRES-TEST-FLAKY-001

Data: 2026-09-24  
Gate: `presentation_reveal_teardown_no_unhandled`  
Origem: Build Windows App run `35972651670` (job `security` → `pnpm test`)

## Sintoma

286 testes passaram, mas Vitest reportou **1 unhandled error**:
`ReferenceError: document is not defined` em `reveal.js` (`Timeout` → `document.createEvent`),
originado em `tests/presentation/session.test.tsx`.

## Causa raiz

Após `deck.initialize()`, o Reveal.js 6 agenda `setTimeout(..., 1)` para emitir o
evento `ready` via `document.createEvent`, **sem** cancelar esse timer em `destroy()`.
Unmount/teardown rápido (ou reset do jsdom entre arquivos) faz o callback rodar sem
`document`.

## Correção

1. `src/presentation/presentation-deck.ts`: flush de 2ms após `initialize()` antes de
   devolver o controller; `destroy()` idempotente.
2. `src/presentation/PresentationStage.tsx`: cleanup destrói o controller ativo mesmo
   se `deckRef` ainda não estiver atribuído na janela de corrida.
3. `tests/presentation/session.test.tsx`: espera `.reveal.ready` e drena 10ms no `afterEach`.

## Evidência

Ver checks no complete ESAA e loops locais de `pnpm vitest run tests/presentation`.

## Resultados locais (2026-09-24)

| Suite | Resultado |
|---|---|
| `vitest run tests/presentation` ×25 | 0/25 falhas (sem unhandled) |
| `vitest run session.test.tsx --pool=forks` ×20 | 0/20 falhas |
| `pnpm test` ×3 | 52 files / 286 tests, 0 unhandled |
| `pnpm typecheck` | ok |
| `bash scripts/install-security-tools.sh` (equiv. CI) | exit 0; 286 passed, 0 unhandled |

Reprodução do flake local antes do fix: não ocorreu em 15+20 loops; causa confirmada por análise estática do Reveal.js 6.0.2 (`je` → `setTimeout(1)` → `J`/`document.createEvent`; `Ge`/`destroy` não cancela o timer).
