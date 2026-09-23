# SEC-011 — Dependências e supply chain (Reauditoria 23/09/2026)

Escopo: MD Studio pós-remediação, análise do manifesto, lockfiles congelados, CI de segurança e execução local de `cargo audit` e `pnpm audit`.

## DS-001 — vulnerabilidades conhecidas: aprovado
`pnpm audit --audit-level high` executado com sucesso: 0 vulnerabilidades conhecidas encontradas no ecossistema JavaScript.
`cargo audit` sobre `src-tauri/Cargo.lock`: 0 vulnerabilidades.

## DS-002 — manutenção: controlado / parcial
Zero vulnerabilidades conhecidas. A árvore transitiva Rust possui 7 avisos de crates unmaintained do ecossistema Tauri v1/GTK, com acompanhamento formal e deadline fixado para 23/10/2026 em `docs/security/rust-advisory-residuals-2026-09-23.md` (tarefa ESAA `MD-SEC-RUST-FOLLOWUP-20261023`).

## DS-003 — typosquatting: aprovado
Nenhuma variante suspeita detectada entre as dependências diretas.

## DS-004 — lockfiles: aprovado
`pnpm-lock.yaml`, `src-tauri/Cargo.lock` e `src-tauri/crates/md-studio-core/Cargo.lock` presentes e íntegros.

## DS-005 — auditoria contínua: aprovado
Pipeline `.github/workflows/security-gates.yml` e script de segurança executam pnpm audit e cargo audit com gates bloqueantes. Testes e typecheck no CI tornados estritamente bloqueantes sem `|| true`.

## DS-006 — build reproduzível: aprovado
Fallback não congelado `|| pnpm install` removido; forçado `--frozen-lockfile`, `cargo ... --locked`, toolchains fixadas em Node 22.14.0 e Rust 1.96.1.
