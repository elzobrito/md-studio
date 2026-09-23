# SEC-024 — Segurança de frontend (Reauditoria 23/09/2026)

Escopo: código-fonte do MD Studio pós-remediações dos riscos de CSS e auditoria JS.

## FE-001 — tokens em localStorage: aprovado
Sem tokens ou credenciais em armazenamento local; rascunhos protegidos por política de retenção.

## FE-002 / IV-007 — CSS arbitrário e sanitização: aprovado (remediado)
Sanitização restrita implementada em `stripMarkdownStyles` e `restrictRendererStyles`:
- Remove estilos arbitrários com `position`, `inset`, `z-index` e background maliciosos provenientes do Markdown.
- Preserva tokens seguros e controlados de cores gerados pelo Shiki.
- Suíte completa de testes de regressão aprovada em `markdown-css.test.ts`.

## FE-003 / DS-001 — dependências JavaScript: aprovado (concluído)
`pnpm audit --audit-level high` executado com 0 vulnerabilidades conhecidas encontradas.

## FE-004 — lógica crítica no frontend: aprovado
Operações críticas de arquivo e resolução canônica de caminhos permanecem estritamente no backend nativo Tauri.
