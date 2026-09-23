# SEC-003 — Inventário de superfícies de ataque

Alvo: MD Studio 0.2.0, revisão `f8eaf22`.

## Entradas existentes

- 20 comandos Tauri IPC registrados em `src-tauri/src/lib.rs:70-90`, enumerados individualmente em `endpoints-inventory.json`. A classificação `local_webview` descreve o chamador esperado; não é autenticação de usuário.
- Caminho de arquivo fornecido pelo SO no cold start e na segunda instância (`src-tauri/src/lib.rs:27-50`), propagado à UI por `get_launch_path`/evento.
- Conteúdo `.md`, YAML frontmatter, wiki links, HTML embutido, URLs, imagens, código fenced e Mermaid entram pelo parser (`src/markdown/processor.ts`).
- `open_workspace` recebe caminho absoluto e estabelece raiz local; leitura, salvamento, índice e watcher recebem workspace ID e caminhos relativos. `export_html` recebe caminho absoluto de saída. `format_code` recebe idioma e texto e invoca formatadores locais selecionados.
- Arquivos de configuração e lockfiles entram no build/CI.

## Ausências e enquadramento

Não há endpoint HTTP do produto, upload via rede, WebSocket, webhook, fila, usuário autenticado ou papel admin. Assim, checks de autenticação, sessão, IDOR multiusuário, rate limiting HTTP e headers de servidor tendem a `not_applicable`. A ausência de endpoint HTTP não elimina as fronteiras arquivo → WebView, WebView → IPC, IPC → filesystem/processo.

## Controles a verificar na fase 2

Contenção de caminhos e symlinks, conteúdo não confiável no preview e no HTML exportado, execução de formatadores sem shell, dependências, limites de recursos e configuração de CSP/Tauri capabilities. Inventário derivado de `invoke_handler` e comandos anotados `#[tauri::command]`, não de suposição baseada na estrutura de pastas web do playbook.
