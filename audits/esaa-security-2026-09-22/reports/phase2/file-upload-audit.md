# SEC-016 — Auditar Upload de Arquivos

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Abrir/salvar arquivos locais via diálogo ou IPC não é upload para servidor. O inventário SEC-003 não contém endpoint multipart/upload; travessia de caminho local é coberta em SEC-015.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| FU-001 Uploads sem validação de tipo | not_applicable | Nenhum endpoint de upload ou armazenamento remoto de arquivo; controle de upload não se aplica. |
| FU-002 Uploads sem limite de tamanho | not_applicable | Nenhum endpoint de upload ou armazenamento remoto de arquivo; controle de upload não se aplica. |
| FU-003 Uploads armazenados no servidor da aplicação | not_applicable | Nenhum endpoint de upload ou armazenamento remoto de arquivo; controle de upload não se aplica. |
| FU-004 Ausência de antivírus | not_applicable | Nenhum endpoint de upload ou armazenamento remoto de arquivo; controle de upload não se aplica. |
| FU-005 Possibilidade de upload executável | not_applicable | Nenhum endpoint de upload ou armazenamento remoto de arquivo; controle de upload não se aplica. |
| FU-006 Filenames não sanitizados | not_applicable | Nenhum endpoint de upload ou armazenamento remoto de arquivo; controle de upload não se aplica. |

Fontes inspecionadas: `src-tauri/src/commands/mod.rs`, `src-tauri/crates/md-studio-core/src/workspace.rs`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
