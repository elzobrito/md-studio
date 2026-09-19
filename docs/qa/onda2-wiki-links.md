# QA — Onda 2 Wiki Links

Data: 2026-09-19  
Gate: `onda_2_wiki_links_complete`

## Resultado

PASS. As tarefas `MD-WIKI-001` a `MD-WIKI-007` foram implementadas, revisadas e
movidas para `done`. Não foi adicionada UI de backlinks nem grafo.

## Evidência automatizada

- `pnpm test`: 30 arquivos, 177 testes aprovados.
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado; 797 módulos transformados. Permanecem apenas avisos de
  chunk grande e import misto já reportados pelo Vite.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 6 testes aprovados; permanece
  um warning preexistente de campos não lidos no watcher.
- `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml`: 38 testes
  aprovados, incluindo resolução wiki, persistência atômica e path fence.
- `git diff --check`: aprovado.

Cobertura específica:

- resolução por path, stem e título; miss, alias, colisão e traversal;
- serialização camelCase e IPC tipado;
- render `[[Target]]` e `[[Target|Alias]]`, sanitização e exclusão de code spans;
- filtro/inserção do autocomplete e regressão do slash menu;
- sanitização de nome/caminho ao criar nota;
- testes do workspace rejeitam caminho absoluto e `..`.

## Evidência visual local

Servidor Vite aberto em `http://127.0.0.1:1420` e inspecionado no navegador
controlado:

- página carregou com conteúdo e controles interativos, sem tela em branco ou
  overlay de erro;
- estados iniciais de Sumário e Links apareceram corretamente;
- em um documento novo, `# Teste` e `[[Nova Nota|criar nota]]` foram digitados;
- o preview exibiu o heading e o alias `criar nota` como link com estilo de não
  resolvido;
- o clique foi interceptado sem navegação externa e abriu o diálogo
  `Criar nota “Nova Nota”`;
- o campo sugeriu `nova-nota.md` e `Cancelar` fechou o diálogo sem gravar.

O executável recomendado `agent-browser` não estava instalado no PATH. Foram
executados os mesmos checks com o navegador controlado disponível, incluindo
árvore de acessibilidade e inspeção visual por screenshot. O teste visual em
navegador valida o frontend; o path fence e a escrita real Tauri foram validados
pelas suítes Rust, não por uma sessão desktop Tauri interativa.

## Critérios da WBS

- [x] Resolve rules + testes Rust.
- [x] IPC + tipos frontend.
- [x] Preview render + navegação.
- [x] Autocomplete `[[`.
- [x] Painel outgoing.
- [x] Criar a partir de unresolved.
- [x] Testes, typecheck, build e testes Rust verdes.
- [x] Regressão visual do shell, preview e temas sem erro bloqueante.
- [x] Sem UI de grafo/backlinks.
