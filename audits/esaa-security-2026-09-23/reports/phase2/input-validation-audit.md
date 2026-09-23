# SEC-015 — Validação de entrada (Reauditoria 23/09/2026)

Escopo: revisão pós-remediação da sanitização de CSS e validação de entrada no MD Studio.

| Check | Resultado | Evidência e limite |
| --- | --- | --- |
| IV-001 SQL injection | not_applicable | Sem banco SQL no aplicativo. |
| IV-002 Command injection | pass | Allowlist estrita de formatadores em `src-tauri/src/commands/formatter.rs`, sem uso de shell. |
| IV-003 Template injection | not_applicable | Sem motores de template servidor expostos. |
| IV-004 SSRF | not_applicable | Sem requisições HTTP server-side controladas por entrada do usuário. |
| IV-005 XSS | partial | Payloads com `onerror` e `javascript:` bloqueados; HTML sanitizado com restrição de CSS. |
| IV-006 Inputs não validados | partial | Resolução de caminhos com `resolve_within` protegida contra path traversal; limites de tamanho tratados pelo sistema local. |
| IV-007 Sanitização ausente/insuficiente | pass | Remediado: `stripMarkdownStyles` e `restrictRendererStyles` bloqueiam position, inset, z-index e estilos inline arbitrários, preservando Shiki. Aprovado em `markdown-css.test.ts`. |
| IV-008 Deserialização insegura | pass | Frontmatter validado com Zod e `yaml.parse`, sem classes/funções arbitrárias. |
| IV-009 XXE | partial | Parser DOM de SVG para Mermaid sem entidades externas. |
| IV-010 Open Redirect | not_applicable | Sem handlers de redirecionamento HTTP no cliente desktop. |
