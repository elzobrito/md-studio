# PRD — MD Studio Core

## Resultado esperado

Um aplicativo desktop local capaz de abrir uma pasta ou arquivo Markdown,
editar o conteúdo, renderizar preview e salvar com proteção contra perda ou
sobrescrita de alterações externas.

## RF-01 — Workspace local

- Abrir arquivo `.md` ou pasta por diálogo nativo e drag-and-drop.
- Representar o workspace por identificador opaco e caminhos relativos; o
  frontend não recebe acesso genérico ao filesystem.
- Canonicalizar todo caminho no backend Rust e rejeitar travessia, URI não
  autorizada ou link simbólico que saia da raiz sem consentimento explícito.
- Exibir árvore ordenada, com estados de carregamento, erro de permissão,
  arquivo removido e diretórios grandes.
- Arquivos não Markdown podem aparecer como assets, mas não são editados como
  texto automaticamente.

## RF-02 — Edição e persistência

- Editor CodeMirror 6 com documento ativo único na v1, desfazer/refazer,
  atalhos e indicador dirty.
- `Ctrl+S` é o mecanismo padrão de persistência; autosave do arquivo-fonte fica
  desligado.
- A leitura retorna conteúdo, encoding suportado, mtime e hash. O salvamento
  envia o hash esperado e falha com conflito se o arquivo mudou externamente.
- A gravação é atômica: arquivo temporário no mesmo filesystem, flush/fsync e
  rename, preservando o original quando qualquer etapa falhar.
- Rascunhos de recuperação são separados do arquivo-fonte, identificados pelo
  workspace/documento e descartados somente após salvamento confirmado ou
  decisão explícita do usuário.
- Conflitos oferecem recarregar, comparar ou salvar como novo arquivo; nunca
  sobrescrevem silenciosamente.

## RF-05 — Assets e navegação

- Resolver imagens e links relativos contra o diretório do documento atual e
  a raiz canônica do workspace.
- Links para outro `.md` abrem dentro do aplicativo; âncoras navegam no preview.
- `file://`, caminhos absolutos e destinos externos exigem política explícita.
- Imagens remotas ficam bloqueadas por padrão e podem ser liberadas por ação do
  usuário para o documento ou sessão.
- SVG local passa por sanitização antes da inserção no DOM.

## RF-06 — Descoberta e sessão

- Busca textual no documento e no workspace com cancelamento, limite de
  resultados e indicação de arquivos não lidos por erro.
- Watcher detecta criação, alteração, remoção e renomeação, com debounce e
  tratamento de eventos duplicados.
- Alteração externa em documento limpo recarrega após confirmação configurável;
  em documento dirty sempre gera conflito visível.
- Sumário deriva dos headings renderizados, possui slugs estáveis e acompanha a
  posição do preview.
- Restaurar último workspace, documento, tamanho dos painéis, tema e preferências
  sem persistir conteúdo sensível desnecessário.

## Interfaces públicas mínimas

- Tipos: `WorkspaceRef`, `DocumentSnapshot`, `SaveDocumentRequest`,
  `SaveConflict`, `SearchResult` e `WatchEvent`.
- Comandos Tauri: abrir workspace, listar entradas, ler documento, salvar
  documento, buscar, iniciar/parar watcher e revelar arquivo autorizado.
- Todos os erros atravessam IPC como códigos tipados e mensagens seguras; stack
  trace e caminho interno desnecessário não são exibidos ao usuário.
