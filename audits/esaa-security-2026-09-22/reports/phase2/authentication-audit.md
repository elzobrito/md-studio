# SEC-012 — Auditar Autenticação

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Aplicativo Tauri local sem contas, login, senha, MFA, reset, token ou JWT próprios. Não se está auditando a autenticação do sistema operacional.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| AU-001 Senhas armazenadas em texto plano | not_applicable | Não há armazenamento de senha de usuário no produto. |
| AU-002 Hash de senha inseguro | not_applicable | Não há hash de senha; SHA-256 é usado para integridade de documento, não credenciais. |
| AU-003 Ausência de MFA | not_applicable | Sem conta/login próprio a proteger com MFA. |
| AU-004 Reset de senha inseguro | not_applicable | Não há fluxo de reset de senha. |
| AU-005 Sessões sem expiração | not_applicable | A sessão em src/state/session.ts é somente preferência visual; não é sessão autenticada. |
| AU-006 Ausência de proteção contra brute force | not_applicable | Não há endpoint de login sujeito a brute force. |
| AU-007 Tokens permanentes | not_applicable | Não há tokens de autenticação próprios. |
| AU-008 Session fixation | not_applicable | Não há identificador de sessão de autenticação a fixar. |
| AU-009 Fraquezas específicas de JWT | not_applicable | Sem emissão/verificação de JWT; algoritmos, kid, segredo HS e RS/HS não se aplicam. |

Fontes inspecionadas: `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src/state/session.ts`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
