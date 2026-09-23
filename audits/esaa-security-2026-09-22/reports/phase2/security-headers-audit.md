# SEC-019 — Auditar Headers de Segurança

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Aplicativo desktop Tauri sem servidor HTTP. A política CSP é relevante para a WebView; HSTS e headers de resposta HTTP não têm endpoint_base_url para teste.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| SH-001 Content-Security-Policy ausente | partial | CSP existe em tauri.conf.json, mas style-src permite unsafe-inline e script-src permite unsafe-eval; a extensão de style arbitrário é demonstrada em FE-002/IV-007. |
| SH-002 Strict-Transport-Security ausente | not_applicable | Sem resposta HTTP própria para HSTS. |
| SH-003 X-Frame-Options ausente | not_applicable | Sem resposta HTTP própria para X-Frame-Options. |
| SH-004 X-Content-Type-Options ausente | not_applicable | Sem resposta HTTP própria para X-Content-Type-Options. |
| SH-005 Referrer-Policy ausente | not_applicable | Sem resposta HTTP própria para Referrer-Policy. |

Fontes inspecionadas: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
