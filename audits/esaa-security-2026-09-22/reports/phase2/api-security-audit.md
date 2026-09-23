# SEC-014 — Auditar Segurança de API

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

O inventário SEC-003 mostra 20 comandos IPC e zero endpoints HTTP. Checks HTTP são N/A; equivalentes IPC são avaliados onde pertinentes.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| AP-001 Endpoints sem rate limit | not_applicable | Sem endpoint HTTP público; rate limit HTTP não se aplica ao IPC local. |
| AP-002 Endpoints retornando dados excessivos | partial | get_all_documents e list_entries retornam dados locais à webview sem paginação; não há identidade remota, mas revisar minimização para workspaces grandes. |
| AP-003 Enumeração de usuários | not_applicable | Sem contas ou endpoint de busca de usuários. |
| AP-004 Falta de validação de schema | partial | Serde tipa requests estruturados como SaveDocumentRequest; vários comandos aceitam String livre. Validação de path ocorre no core, mas tamanho/forma de todos os inputs não foi demonstrado. |
| AP-005 Falta de versionamento de API | not_applicable | Sem API HTTP externa versionada; comandos IPC internos seguem versão do app. |
| AP-006 Ausência de paginação | partial | list_entries/get_all_documents não paginam; exposição é local e impacto primário seria desempenho. |
| AP-007 Replay attacks possíveis | not_applicable | Sem autenticação remota ou transação de rede passível de replay; save_document usa expected_hash para conflito local. |
| AP-008 Mass assignment / BOPLA write-side | pass | Busca por spread de req.body/Object.assign em modelos não encontrou stack de API HTTP; requests IPC são structs tipadas. Não foi identificado mass assignment. |
| AP-009 Consumo inseguro de APIs externas | not_applicable | Nenhum cliente HTTP externo no código de aplicação inspecionado; reqwest aparece apenas como transitiva no lockfile. |

Fontes inspecionadas: `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/metadata.rs`, `src-tauri/capabilities/default.json`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
