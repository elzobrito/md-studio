# Mapa de Funcionalidades, Funções e Rotas — MD Studio

**Versão do Produto:** v0.1 (Ondas 0, 0B, 0C, 1, 2 e 3 Concluídas)  
**Stack:** Tauri 2 (Rust) + React 19 + TypeScript + CodeMirror 6 + Unified  
**Repositório:** [github.com/elzobrito/md-studio](https://github.com/elzobrito/md-studio)  
**Ambiente:** Desktop Linux (Local-first / Offline)

---

## 1. Mapeamento de Funcionalidades (Feature Matrix)

### 1.1. Autoria e Edição de Conteúdo
- **Editor CodeMirror 6 de Alta Fidelidade:** Editor monoespaçado otimizado para Markdown com numeração de linhas, realce de sintaxe em tempo real e quebra suave de linha (*soft wrap*).
- **Barra de Formatação Contextual (`FormattingToolbar`):** Ações rápidas para Títulos (`H1`, `H2`, `H3`), Negrito, Itálico, Tachado, Links, Imagens, Código inline, Blocos de código, Citações, Listas (ul, ol, tarefas), Tabelas e Divisores.
- **Barra de Ferramentas de Tabela (`TableToolbar`):** Aparece automaticamente quando o cursor está dentro de uma tabela Markdown, permitindo inserir/remover linhas e colunas e formatar alinhamentos.
- **Menu de Comandos Rápidos / Slash Commands (`/`):** Digitar `/` no início de linha vazia abre um menu suspenso para inserção instantânea de blocos (código, tabelas, alertas, fórmulas, diagramas).
- **Colagem Inteligente (*Smart Paste*):** Detecta links colados sobre texto selecionado e transforma automaticamente em `[texto](url)` sem perder o texto original; converte tabelas HTML/Excel em tabelas Markdown.
- **Dicas Contextuais de Markdown (*Contextual Hints*):** Pequenas dicas informativas de atalho e sintaxe exibidas discretamente no rodapé do editor conforme o contexto do cursor.

### 1.2. Modelos de Documento (*Templates*)
- **Modal de Modelos (`NewDocumentModal`):** Disparado em todos os pontos de criação (`+` no cabeçalho, `Novo documento` na tela inicial, área vazia ou `Ctrl+N`).
- **7 Modelos Integrados:**
  1. **📄 Em branco:** Inicia com o editor limpo.
  2. **🤝 Reunião:** Pauta, participantes, decisões e tabela de ações com data dinâmica em pt-BR.
  3. **📊 Relatório:** Sumário executivo, contexto, desenvolvimento e conclusões com data dinâmica.
  4. **📓 Anotações:** Conceitos principais, exemplos, dúvidas e resumo pessoal.
  5. **📐 Especificação:** Versão, status, escopo (dentro/fora), requisitos funcionais/não-funcionais.
  6. **📔 Diário:** Reflexão, aprendizados, metas e gratidão com data formatada.
  7. **📦 README:** Template completo de documentação de projetos open-source.

### 1.3. Pipeline de Renderização & Visualização (AST)
- **Pipeline Sanitizado e Seguro:** Processamento via Unified/Remark/Rehype com isolamento estrito contra XSS (`rehype-sanitize`).
- **CommonMark & GFM:** Suporte integral a tabelas, task lists (`- [x]`), autolinks, emojis e notas de rodapé.
- **KaTeX:** Renderização de fórmulas matemáticas inline (`$...$`) e em bloco (`$$...$$`).
- **Mermaid:** Renderização reativa de diagramas de sequência, fluxogramas, grafos e diagramas de classe em container SVG isolado com tratamento seguro de erros de sintaxe.
- **Highlight.js:** Realce de sintaxe de dezenas de linguagens em blocos de código cercados (` ```lang `).
- **Alertas / Callouts GFM:** Suporte a `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` e `> [!CAUTION]`.

### 1.4. Wiki Links e Conexões Bidirecionais
- **Sintaxe de Wiki Links:** Suporte a links internos no formato `[[alvo]]` e com rótulo customizado `[[alvo|Rótulo Visível]]`.
- **Autocompleção com Trigger `[[`:** Digitar `[[` no editor abre um menu flutuante listando todos os arquivos `.md` do workspace indexados.
- **Resolução de Links no Core Rust (`wiki_resolve.rs`):**
  - `Resolved`: Encontra correspondência unívoca no workspace.
  - `Ambiguous`: Mais de um arquivo possui o mesmo nome base em pastas diferentes.
  - `Unresolved`: Nota referenciada ainda não existe.
- **Painel de Links de Saída (`OutgoingLinksPanel`):** Exibe no painel direito todos os links contidos no documento atual com seus respectivos status.
- **Criação Rápida de Notas:** Clicar em um wiki link `Unresolved` abre o modal `CreateNoteFromWiki` para criar a nota no caminho correto e abri-la no editor.
- **Painel de Backlinks (`BacklinksPanel` - Onda 3):** Lista reversa de todos os outros documentos do workspace que apontam para o arquivo aberto, agrupados com snippet de contexto textual e navegação por clique direto para a linha da ocorrência.

### 1.5. Gestão de Workspace e Persistência Segura
- **Local-First & Path Fencing:** Operações confinadas ao diretório raiz escolhido pelo usuário; rejeição no Rust de qualquer tentativa de *path traversal* (`../`).
- **Gravação Atômica (`save_document`):** Escrita em arquivo temporário com `fsync` seguido de renomeação atômica para evitar perda de dados por queda de energia.
- **Detecção de Conflitos Concorrentes:** Verificação de SHA-256 antes da gravação. Se o arquivo no disco foi alterado externamente, o diálogo `ConflictDialog` oferece opções: *Recarregar do Disco*, *Manter Edição Local* ou *Salvar Como*.
- **Observador de Arquivos (*Watcher FS*):** Motor `notify` em Rust observando modificações em tempo real com debounce estável.
- **Exportação HTML Autossuficiente:** Botão `[⇩ Exportar HTML]` no cabeçalho; gera documento HTML autônomo com estilos embutidos e scripts seguros. Protegido para só ficar habilitado com arquivo ativo.

---

## 2. Rotas e Modos de Navegação da Interface (UI Routes)

O MD Studio adota uma arquitetura de rotas orientada a estados de visão e layout (`session.viewMode` e `documentState`), eliminando recargas de página.

### 2.1. Modos Principais de Visualização (*View Modes*)
| Modo | ID | Descrição |
|---|:---:|---|
| **Markdown** | `source` | Tela dedicada à edição de código-fonte no CodeMirror 6 com todas as barras de formatação. |
| **Formatado** | `preview` | Visualização renderizada somente leitura com o pipeline completo (GFM, KaTeX, Mermaid, Wiki Links). |
| **Dividida** | `split` | Edição e preview lado a lado com sincronização bidirecional de rolagem (*Scroll Sync*). |
| **Zen** | `zen` | Modo tela cheia imersivo ativado por `F11`, ocultando barras de ferramentas e painéis. |

### 2.2. Telas de Estado da Aplicação
| Tela | Condição | Descrição |
|---|---|---|
| **`WelcomeScreen`** | `!isWriting && !doc.relativePath && !doc.workspace` | Tela inicial de primeiro acesso com atalhos para *Novo documento*, *Abrir pasta*, *Abrir arquivo* e lista de *Arquivos recentes*. |
| **`EmptyState`** | `!isWriting && !doc.relativePath && doc.workspace` | Exibida quando uma pasta de trabalho foi aberta, mas nenhum arquivo está selecionado. |
| **`Editor Workspace`** | `Boolean(isWriting || doc.relativePath)` | Área de trabalho ativa com editor e/ou preview conforme o modo de visão selecionado. |

### 2.3. Modais e Diálogos de Interação
| Componente | Gatilho | Responsabilidade |
|---|---|---|
| **`NewDocumentModal`** | `Ctrl+N` / Botão `+` / Telas vazias | Escolha de templates (7 opções) ou documento em branco. |
| **`CommandPalette`** | `Ctrl+P` / `Ctrl+Shift+P` | Quick switcher para localizar e abrir notas do workspace por busca difusa (*fuzzy search*). |
| **`ShortcutsModal`** | `F1` / Botão `⌨` | Tabela visual com todos os atalhos de teclado do sistema. |
| **`GoToLine`** | `Ctrl+G` | Pula diretamente para uma linha específica do documento no CodeMirror. |
| **`SettingsPanel`** | `Ctrl+,` / Botão `⚙` | Painel de configurações visuais (Tema Escuro, Claro, Automático, Zoom). |
| **`CreateNoteFromWiki`** | Clique em link não resolvido | Diálogo de confirmação para criar nova nota `.md` a partir do link. |
| **`ConflictDialog`** | Modificação externa de arquivo aberto | Diálogo de resolução de conflitos (*Recarregar*, *Manter*, *Salvar Como*). |

### 2.4. Rotas de Navegação por Teclado (Global Keybindings)
O MD Studio dispõe de um barramento de atalhos globais gerenciado por [`useKeyboardShortcuts`](file:///home/elzobrito/desenvolvimento/md-studio/src/hooks/useKeyboardShortcuts.ts), que intercepta e despacha navegação sem colisões com campos de texto:

| Categoria | Atalho | Ação / Rota de Navegação Disparada |
|---|:---:|---|
| **Arquivo** | `Ctrl + N` | Abre o `NewDocumentModal` para seleção de template ou documento limpo. |
| **Arquivo** | `Ctrl + O` | Dispara o seletor nativo de arquivos (`pickMarkdownFile`) para abrir nota individual. |
| **Arquivo** | `Ctrl + Shift + O` | Dispara o seletor nativo de diretórios (`pickFolder`) para abrir pasta como workspace. |
| **Arquivo** | `Ctrl + S` | Persistência atômica do arquivo ativo (`save_document`). |
| **Arquivo** | `Ctrl + Shift + S` | Dispara fluxo "Salvar Como..." com seletor nativo. |
| **Arquivo** | `Ctrl + W` | Fecha o documento ativo e retorna à tela inicial ou vazia (`closeFile`). |
| **Visualização** | `Ctrl + 1` | Rota para o modo **Markdown** (`source`). |
| **Visualização** | `Ctrl + 2` | Rota para o modo **Formatado** (`preview`). |
| **Visualização** | `Ctrl + 3` | Rota para o modo **Dividida** (`split`). |
| **Visualização** | `F11` | Alterna para o modo **Zen** (imersão em tela cheia sem barras). |
| **Visualização** | `Ctrl + B` ou `Ctrl + \` | Alterna exibição da Barra Lateral Esquerda (Explorador de Arquivos). |
| **Visualização** | `Ctrl + J` ou `Ctrl + Shift + \` | Alterna exibição do Painel Direito (Sumário / Links / Backlinks). |
| **Visualização** | `Alt + S` | Alterna a sincronização de rolagem (*Scroll Sync*) no modo split. |
| **Navegação** | `Ctrl + P` / `Ctrl + Shift + P` | Abre o `CommandPalette` (busca difusa de notas). |
| **Navegação** | `Ctrl + G` | Abre o modal `GoToLine` para salto direto de linha. |
| **Navegação** | `Alt + ↑` | Navega ciclicamente para o arquivo recente anterior no histórico. |
| **Navegação** | `Alt + ↓` | Navega ciclicamente para o próximo arquivo recente no histórico. |
| **Editor** | `Ctrl + Home` | Salta o cursor diretamente para a primeira linha do documento. |
| **Editor** | `Ctrl + End` | Salta o cursor diretamente para a última linha do documento. |
| **Interface** | `F1` ou `Ctrl + /` | Abre/fecha o modal visual de ajuda e atalhos (`ShortcutsModal`). |
| **Interface** | `Ctrl + ,` | Abre o modal de configurações de tema e interface (`SettingsPanel`). |
| **Interface** | `Ctrl + =` / `Ctrl + +` | Amplia o nível de zoom da interface visual (*Zoom In*). |
| **Interface** | `Ctrl + -` | Reduz o nível de zoom da interface visual (*Zoom Out*). |
| **Interface** | `Ctrl + 0` | Restaura o zoom padrão de 100% da interface visual (*Zoom Reset*). |

### 2.5. Rotas de Navegação Interna de Conteúdo
1. **Navegação por Wiki Links (`[[alvo]]`):**
   - No preview (`MarkdownViewer`), links com classe `.wiki-link` interceptam o clique.
   - Links resolvidos (`Resolved`): invocam `onOpenRelative(path)` abrindo imediatamente o documento correspondente.
   - Links não-resolvidos (`Unresolved`): abrem o modal `CreateNoteFromWiki`, permitindo gerar o arquivo no disco com um clique.
2. **Navegação por Sumário / Headings:**
   - Clicar em qualquer cabeçalho no `DocumentOutline` aciona `scrollToHeading(slug, viewMode)`, calculando a posição e rolando suavemente a linha do CodeMirror ou a âncora do DOM renderizado.
3. **Navegação Reversa por Backlinks:**
   - Clicar em qualquer ocorrência no `BacklinksPanel` executa `openRelative(sourcePath)` e enfileira `queueGoToLine(occurrence.line)`, posicionando o cursor exatamente na linha do link referenciador.

---

## 3. Contratos, Rotas IPC e Eventos do Backend (Tauri 2 Rust)

Todas as rotas IPC e canais de eventos estão registrados em [`src-tauri/src/lib.rs`](file:///home/elzobrito/desenvolvimento/md-studio/src-tauri/src/lib.rs) e expostos com tipagem TypeScript segura em [`src/lib/ipc/`](file:///home/elzobrito/desenvolvimento/md-studio/src/lib/ipc).

### 3.1. Comandos IPC de Requisição e Resposta (Tauri Invokes — 19 Comandos)

| Comando IPC (Rota) | Módulo Rust | Parâmetros de Entrada | Retorno (Payload) | Descrição e Regras de Segurança |
|---|---|---|---|---|
| `open_workspace` | `commands::mod` | `path: String` | `WorkspaceDescriptor` | Registra e valida pasta raiz do workspace. Aplica canonicalização estrita de caminho. |
| `list_entries` | `commands::mod` | `workspace_id: String, subpath?: String` | `Vec<FileEntry>` | Lista recursiva de diretórios e arquivos `.md` respeitando a barreira do workspace (*path fence*). |
| `read_document` | `commands::mod` | `workspace_id: String, relative_path: String` | `DocumentSnapshot` | Lê arquivo `.md` e calcula hash SHA-256 do conteúdo para controle de concorrência. |
| `save_document` | `commands::mod` | `payload: SavePayload` | `SaveResult` | Gravação atômica com validação de hash esperado (`expectedHash`). Dispara atualização incremental do índice. |
| `search_workspace` | `commands::mod` | `workspace_id: String, query: String` | `Vec<SearchResult>` | Busca textual e por títulos em todos os arquivos do workspace. |
| `export_html` | `commands::mod` | `path: String, html: String, overwrite: bool` | `ExportResult` | Grava arquivo `.html` autossuficiente no caminho absoluto fornecido. Rejeita sobrescrita sem confirmação explícita. |
| `get_launch_path` | `commands::mod` | — | `Option<String>` | Obtém caminho de arquivo `.md` passado via linha de comando ou clique duplo do sistema operacional. |
| `close_splash` | `commands::mod` | — | `()` | Fecha a janela temporária de splash e exibe a janela principal de 1280x800 com foco. |
| `start_watching` | `watcher::mod` | `workspace_id: String, root_path: String` | `()` | Inicia o observador de filesystem (`notify`) na raiz com debounce para detectar alterações externas. |
| `stop_watching` | `watcher::mod` | — | `()` | Encerra com segurança o worker thread do observador de arquivos. |
| `get_workspace_stats` | `commands::metadata` | `workspace_id: String` | `WorkspaceStats` | Quantidade de documentos indexados, total de tags e links mapeados. |
| `get_document_metadata` | `commands::metadata` | `workspace_id: String, relative_path: String` | `Option<DocumentMetadata>` | Retorna frontmatter, tags e links extraídos de uma nota específica. |
| `get_all_documents` | `commands::metadata` | `workspace_id: String` | `Vec<DocumentSummary>` | Lista leve de todos os documentos para autocompleção rápida. |
| `trigger_reindex` | `commands::metadata` | `workspace_id: String` | `WorkspaceStats` | Varre novamente todo o workspace e regrava `.mdstudio/index.json`. |
| `get_wiki_links_for` | `commands::metadata` | `workspace_id: String, relative_path: String` | `Vec<ExtractedWikiLink>` | Extrai todos os wiki links crus contidos em uma nota. |
| `resolve_wiki_link` | `commands::metadata` | `workspace_id: String, from_path: String, target: String` | `ResolvedWikiLink` | Resolve caminho relativo unívoco no workspace (`Resolved`, `Ambiguous`, `Unresolved`). |
| `get_resolved_wiki_links_for` | `commands::metadata` | `workspace_id: String, relative_path: String` | `Vec<ResolvedWikiLink>` | Retorna os links do documento com seus status e caminhos canônicos calculados. |
| `get_tags` | `commands::metadata` | `workspace_id: String` | `Vec<TagInfo>` | Lista agregada de todas as tags `#tag` encontradas nos documentos. |
| `get_backlinks` | `commands::metadata` | `workspace_id: String, target_path: String` | `Vec<BacklinkOccurrence>` | **Onda 3:** Retorna todas as ocorrências de notas que apontam para o arquivo aberto, com linha (1-based) e snippet de contexto sob demanda. Self-links são excluídos. |

### 3.2. Rotas de Canais de Eventos Assíncronos (Tauri Event Channels)

Diferente dos comandos síncronos de requisição/resposta, os canais de eventos transmitem notificações reativas do Rust para o Frontend via barramento de eventos do Tauri (`tauri::Emitter`):

| Canal de Evento | Origem (Rust) | Payload | Listener Frontend | Comportamento e Regras de Negócio |
|---|---|---|---|---|
| **`workspace://change`** | `WatcherHub` (`watcher::mod`) | `WatchEventDto { type, relativePath, from?, workspaceId }` | `subscribeWorkspaceWatch` ([`client.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/lib/ipc/client.ts)) | Disparado em alterações no disco (criar, modificar, renomear, excluir) com debounce de 300ms. Se o arquivo alterado estiver aberto no editor com modificações não salvas (`dirty`), ativa a rota do modal `ConflictDialog`. |
| **`app://open-file`** | `tauri_plugin_single_instance` ([`lib.rs`](file:///home/elzobrito/desenvolvimento/md-studio/src-tauri/src/lib.rs)) | `{ path: String }` | `subscribeOpenFile` ([`client.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/lib/ipc/client.ts)) | Emitido quando o usuário abre outro arquivo `.md` no sistema operacional (via clique duplo ou CLI) com a aplicação já em execução. Carrega o arquivo na janela ativa e traz o app para o primeiro plano (*focus/unminimize*). |

### 3.3. Rotas de Integração com Plugins Nativos do Sistema Operacional

O MD Studio integra três plugins oficiais do ecossistema Tauri 2 para comunicação segura com o sistema de janelas e o desktop Linux:

| Plugin Tauri | Função / Método | Interface Frontend | Responsabilidade no Sistema |
|---|---|---|---|
| **`tauri-plugin-dialog`** | `open({ directory: true })` | `pickFolder()` | Abre caixa de diálogo nativa do desktop para seleção de pasta raiz do workspace. |
| **`tauri-plugin-dialog`** | `open({ directory: false, filters })` | `pickMarkdownFile()` | Abre diálogo nativo do sistema filtrado para extensões `.md` e `.markdown`. |
| **`tauri-plugin-dialog`** | `save({ filters })` | `pickSaveMarkdownFile()` / `pickSaveHtmlFile()` | Diálogo nativo para escolha de destino ao salvar novos arquivos Markdown ou exportar HTML. |
| **`tauri-plugin-dialog`** | `ask(message, { kind: "warning" })` | `confirmOverwrite(path)` | Alerta nativo modal do SO solicitando confirmação do usuário antes de sobrescrever arquivo existente. |
| **`tauri-plugin-single-instance`** | Callback de inicialização única | Interceptador no Rust | Garante uma única instância do processo do app: se executado novamente, redireciona o arquivo para a janela aberta via `app://open-file`, fecha o splash secundário e foca a janela principal. |
| **`tauri-plugin-opener`** | `openUrl` / Invocação segura | Handler de links externos | Abre links externos (`http://`, `https://`) com segurança no navegador padrão do usuário do Linux, sem executar código inseguro dentro do Webview. |

---

## 4. Estrutura de Funções e Hooks do Frontend (React / TypeScript)

### 4.1. Custom Hooks
- **`useDocumentState` ([`src/state/documentState.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/state/documentState.ts)):**
  - `openWorkspacePath(path)`: Abre workspace local.
  - `openRelative(path)`: Abre nota relativa com carregamento de rascunhos (*drafts*).
  - `openFile(absolutePath)`: Abertura direta via explorador nativo.
  - `save()` / `saveAs()`: Dispara rotinas de persistência segura com tratamento de erros.
  - `newDocument(initialText?)`: Limpa tela e aplica modelo de documento.
  - `closeFile()`: Fecha o arquivo ativo e retorna ao estado desocupado.
  - `resolveConflict(choice)`: Aplica estratégia de conflito (*reload*, *keep*, *saveAs*).

- **`useMetadata` ([`src/hooks/useMetadata.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/hooks/useMetadata.ts)):**
  - Carrega metadados do documento ativo, links de saída resolvidos e lista de backlinks via IPC.
  - Mantém sincronizado o estado para os painéis `OutgoingLinksPanel` e `BacklinksPanel`.

- **`useSaveStatus` ([`src/hooks/useSaveStatus.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/hooks/useSaveStatus.ts)):**
  - Monitora o estado de modificação do documento (`saved`, `modified`, `saving`, `error`).
  - Atualiza o título dinâmico da janela nativa do SO (`MD Studio — ● documento.md`).

- **`useScrollSync` ([`src/hooks/useScrollSync.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/hooks/useScrollSync.ts)):**
  - Sincronização proporcional e suave de scroll entre o editor CodeMirror e o preview HTML no modo dividido (*split*).

- **`useKeyboardShortcuts` ([`src/hooks/useKeyboardShortcuts.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/hooks/useKeyboardShortcuts.ts)):**
  - Central de escuta global de atalhos de teclado com prevenção de conflitos em caixas de texto.

- **`useResizablePanel` ([`src/hooks/useResizablePanel.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/hooks/useResizablePanel.ts)):**
  - Gerencia o redimensionamento por arraste com mouse e limites mínimos/máximos para as barras laterais esquerda e direita.

### 4.2. Stores Globais (Zustand / Event Emitters)
- **`editorStore` ([`src/state/editor.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/state/editor.ts)):** Estado de salvamento, mensagens de erro e navegação para linha específica (`goToLine`).
- **`settingsStore` ([`src/state/settings.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/state/settings.ts)):** Preferências persistidas do usuário (tema visual, zoom da interface).
- **`recentFilesStore` ([`src/state/recent-files.ts`](file:///home/elzobrito/desenvolvimento/md-studio/src/state/recent-files.ts)):** Histórico dos últimos arquivos abertos com persistência local.
