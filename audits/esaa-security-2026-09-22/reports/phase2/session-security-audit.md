# SEC-017 — Auditar Segurança de Sessão

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

O estado persistido em src/state/session.ts são preferências visuais, não sessão autenticada. Sem cookies de login, token, HTTP ou CSRF.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| SS-001 Cookies sem httpOnly | not_applicable | Sem cookie/token/sessão autenticada ou mutação HTTP sujeita a CSRF. |
| SS-002 Cookies sem Secure flag | not_applicable | Sem cookie/token/sessão autenticada ou mutação HTTP sujeita a CSRF. |
| SS-003 SameSite ausente | not_applicable | Sem cookie/token/sessão autenticada ou mutação HTTP sujeita a CSRF. |
| SS-004 Ausência de CSRF token | not_applicable | Sem cookie/token/sessão autenticada ou mutação HTTP sujeita a CSRF. |
| SS-005 Sessões sem expiração | not_applicable | Sem cookie/token/sessão autenticada ou mutação HTTP sujeita a CSRF. |
| SS-006 Tokens reutilizáveis | not_applicable | Sem cookie/token/sessão autenticada ou mutação HTTP sujeita a CSRF. |

Fontes inspecionadas: `src/state/session.ts`, `src-tauri/src/lib.rs`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
