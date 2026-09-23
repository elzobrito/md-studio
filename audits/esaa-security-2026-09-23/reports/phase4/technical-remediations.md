# Remediações técnicas implementadas — MD Studio (23/09/2026)

## 1. CSS arbitrário em Markdown (`SEC-024-FE-002-001` / `SEC-015-IV-007`) — REMEDIADO
- Implementadas as funções `stripMarkdownStyles` e `restrictRendererStyles`.
- Bloqueia estilos perigosos com `position:fixed`, `inset`, `z-index` e fundos opacos que poderiam realizar UI redressing.
- Preserva tokens de sintaxe e realce de código legítimos gerados pelo Shiki.
- Suíte completa de testes aprovada em `src/markdown/markdown-css.test.ts`.

## 2. CI e pipeline de segurança (`SEC-022-DO-002-001` / `SEC-011-DS-005`) — REMEDIADO
- Removido `|| true` de typecheck e testes nos workflows.
- Criado `.github/workflows/security-gates.yml` e script `scripts/security-gates.sh` com:
  - Verificação de secrets via Gitleaks (`DO-003`).
  - SAST via Semgrep (`DO-004`).
  - Auditoria de dependências via `pnpm audit` e `cargo audit` bloqueantes.

## 3. Reprodutibilidade de build (`SEC-011-DS-006-001`) — REMEDIADO
- Removido fallback `|| pnpm install` permitindo resolução não travada.
- Forçado `pnpm install --frozen-lockfile` estrito.
- Cargo configurado com `--locked` em todos os builds e testes.
- Toolchains fixadas: Node 22.14.0 e Rust 1.96.1.
- Configuração de Snapcraft alinhada com as versões congeladas.

## 4. Retenção de rascunhos locais (`SEC-023-DA-003-001`) — REMEDIADO
- Adicionada política de expurgo de rascunhos de 90 dias em `src/lib/drafts/recovery.ts`.
- Adicionado aviso visual aos 75 dias de retenção.
- Implementado diálogo de recuperação/exclusão manual em `src/components/DraftRecoveryDialog.tsx`.
- Suíte de testes aprovada em `src/lib/drafts/draft-retention.test.ts`.

## 5. Dependências Rust transitivas (`SEC-011-DS-002-001`) — CONTROLADO
- Árvore de dependências transitivas atualizada de forma compatível.
- Zero vulnerabilidades conhecidas em `cargo audit`.
- 7 avisos de crates unmaintained documentados em `docs/security/rust-advisory-residuals-2026-09-23.md`.
- Tarefa ESAA de acompanhamento formal criada: `MD-SEC-RUST-FOLLOWUP-20261023` com deadline para 23/10/2026.
