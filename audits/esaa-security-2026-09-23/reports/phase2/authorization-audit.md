# SEC-013 — Auditar Autorização

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Há um único usuário local; a fronteira relevante é renderer Tauri → comandos nativos. A matriz de papéis é: usuário local/main webview → IPC registrado; nenhum papel admin/conta/remoto.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| AZ-001 Controle de acesso ausente | partial | Inventário SEC-003 enumera 20 comandos IPC, não endpoints HTTP. Comandos customizados são registrados para a webview principal; não há identidade de usuário interna. Acesso fica sob confiança no renderer/local OS. |
| AZ-002 IDOR (Insecure Direct Object Reference) | partial | workspace_id é ID aleatório do registry e resolve_within restringe caminhos, mas open_workspace aceita path enviado pela webview. IDOR multiusuário não se aplica; controle de escopo em renderer comprometido não foi testado. |
| AZ-003 Verificação de permissão apenas no frontend | pass | Validação de caminho e hash de save ocorre em Rust, não apenas no frontend. |
| AZ-004 Admin routes expostas | not_applicable | Nenhuma rota admin HTTP ou papel admin identificado. |
| AZ-005 Escopo de permissões mal definido | not_applicable | Matriz roles×permissões: usuário local/main webview → comandos IPC registrados; sem roles diferenciadas. |
| AZ-006 Ações sensíveis sem confirmação | partial | export_html aceita destino absoluto e flag overwrite vinda do renderer; confirmação de sobrescrita está na UI, não imposta no backend. Depende de renderer comprometido/ação local. |

Fontes inspecionadas: `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src-tauri/src/commands/mod.rs`, `src-tauri/crates/md-studio-core/src/workspace.rs`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
