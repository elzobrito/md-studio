# SEC-001 — Inventário técnico do MD Studio (Reauditoria 23/09/2026)

Alvo: `/home/elzobrito/desenvolvimento/md-studio`, commit `f8eaf22` + correções de segurança em 2026-09-23. Auditoria estática local, sem endpoint remoto.

## Stack observada

- Frontend: TypeScript 5.8.2, React/React DOM 19.0.0, Vite 6.2.2, CodeMirror 6, Unified/Remark/Rehype, Shiki 4.4.3, Mermaid 11.6.0, KaTeX 0.16.21. Fontes: `package.json`, `src/markdown/processor.ts`.
- Desktop/backend: Rust 2021, rust-version declarada 1.77 (toolchain 1.96.1 fixada em CI), Tauri 2.4.0, plugins dialog/opener/single-instance, crate local `md-studio-core` 0.2.0. Fontes: `src-tauri/Cargo.toml`, `src-tauri/crates/md-studio-core/Cargo.toml`, `src-tauri/src/lib.rs`.
- Runtime observado: Ubuntu 26.04, kernel Linux 7.0.0-31-generic x86_64, Node 22.14.0 (fixado), pnpm 9.15.4 (frozen-lockfile estrito), cargo/rustc 1.96.1 (--locked).
- Persistência: arquivos Markdown locais, índice local e rascunhos em localStorage com retenção de 90 dias e alerta aos 75 dias. Sem banco SQL, cache servidor ou broker de mensagens identificados.
- Integrações: IPC Tauri e sistema de arquivos local. Sem backend HTTP remoto, sem autenticação web, sem nuvem ou SaaS obrigatório.
- Empacotamento: `.deb` e AppImage configurados em `src-tauri/tauri.conf.json`; workflows CI em `.github/workflows/ci.yml`, `build-windows.yml` e `security-gates.yml`.

## Status dos gates de ferramentas
- cargo audit: disponível, 0 vulnerabilidades (7 avisos residuais documentados e acompanhados sob MD-SEC-RUST-FOLLOWUP-20261023).
- pnpm audit: disponível e concluído, 0 vulnerabilidades.
- Semgrep: ativo em pipeline via `security-gates.yml`.
- Gitleaks: ativo em pipeline via `security-gates.yml`.
