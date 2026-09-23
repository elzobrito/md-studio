# SEC-001 — Inventário técnico do MD Studio

Alvo: `/home/elzobrito/desenvolvimento/md-studio`, revisão local `f8eaf22` em 2026-09-22. Auditoria estática, sem endpoint remoto.

## Stack observada

- Frontend: TypeScript 5.8.2, React/React DOM 19.0.0, Vite 6.2.2, CodeMirror 6, Unified/Remark/Rehype, Shiki 4.4.3, Mermaid 11.6.0, KaTeX 0.16.21. Fontes: `package.json`, `src/markdown/processor.ts`.
- Desktop/backend: Rust 2021, rust-version declarada 1.77, Tauri 2.4.0, plugins dialog/opener/single-instance, crate local `md-studio-core` 0.2.0. Fontes: `src-tauri/Cargo.toml`, `src-tauri/crates/md-studio-core/Cargo.toml`, `src-tauri/src/lib.rs`.
- Runtime observado: Ubuntu 26.04, kernel Linux 7.0.0-31-generic x86_64, Node 22.23.1, pnpm 9.15.4, cargo/rustc 1.96.1.
- Persistência: arquivos Markdown locais, índice local e rascunhos no armazenamento da WebView. Sem banco SQL, cache servidor ou broker de mensagens identificados.
- Integrações: IPC Tauri e sistema de arquivos local. Não foi identificado backend HTTP de produto, autenticação, nuvem ou SaaS obrigatório; workflows do GitHub Actions são infraestrutura de build.
- Empacotamento: `.deb` e AppImage configurados em `src-tauri/tauri.conf.json`; workflows CI em `.github/workflows/ci.yml` e `build-windows.yml`.

## Pré-check do contrato de relatório

`report-template.security.json` e `REPORT_TEMPLATE.md` existem no repositório fonte ESAA-Security, mas não foram copiados para `.roadmap/` desta instância pelo `bootstrap` + ativação do plugin. O relatório final deve referenciar o template fonte validado ou receber um mecanismo governado de instalação desses arquivos. Essa ausência não é vulnerabilidade do MD Studio.
