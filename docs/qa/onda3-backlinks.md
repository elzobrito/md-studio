# QA — Onda 3 Backlinks v3.1

Data: 2026-09-19  
Gate: `onda_3_backlinks_v3_1_complete`  
Verify: `md_backlink_008_qa_pass`

## Resultado

PASS. `MD-BACKLINK-000` a `MD-BACKLINK-007` estão `done`. Esta tarefa encerra a
onda. Não há grafo, segundo watcher, enum `collision` nem campo `column`.

## Cadeia

| ID | Papel | Status |
|---|---|---|
| MD-BACKLINK-000 | governança + commit Onda 2 | done |
| MD-BACKLINK-001 | contrato + mapa | done |
| MD-BACKLINK-002 | Reverse Link Index | done |
| MD-BACKLINK-003 | hooks incrementais | done |
| MD-BACKLINK-004 | IPC `get_backlinks` | done |
| MD-BACKLINK-005 | painel direito | done |
| MD-BACKLINK-006 | go-to-line + highlight | done |
| MD-BACKLINK-007 | a11y | done |
| MD-BACKLINK-008 | este QA | in_progress → done |

## Evidência automatizada

- `pnpm test`: 32 arquivos, **183** testes aprovados (inclui 5 novos em
  `tests/wiki/backlinks-panel.test.tsx` e regressão Onda 2:
  `wiki-completion`, `create-note`, `processor`, `metadata`).
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado; 799 módulos transformados. Permanecem avisos Vite de
  chunk grande e import misto já conhecidos.
- `cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml`:
  **43** unit + **8** integration aprovados (8 testes de índice reverso +
  5 incrementais no `ReindexEngine`).
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: **8** aprovados
  (fence `../`/absoluto e context null não remove ocorrência). Warning
  preexistente de campos não lidos em `ActiveWatch`.
- `git diff --check`: aprovado.
- Um único `RecommendedWatcher` em `src-tauri/src/watcher/mod.rs`.
- Bundle de produção contém `Backlinks`, `get_backlinks` e o empty state.

## Evidência visual (navegador)

`pnpm preview` em `http://127.0.0.1:4173/` inspecionado no Chrome DevTools:

- página carregou com conteúdo e controles, sem tela em branco;
- painel direito mostra Sumário, Links **e Backlinks** (sem sidebar extra);
- empty state: `0 documentos · 0 referências` e
  `Nenhum backlink para este documento.`;
- troca Escuro → Claro: Backlinks permanece visível com os mesmos textos
  (tokens de tema).

Limite: o preview web não tem workspace Tauri; IPC `get_backlinks` no browser
devolve resultado vazio. Path fence, save incremental, watcher e highlight do
caret foram comprovados pelas suítes Rust/FE, não por uma sessão desktop Tauri
interativa.

## Contrato (amostra)

- Só `WikiLinkStatus::Resolved` entra no índice; Unresolved/Ambiguous fora.
- Self-links excluídos.
- `context` lido sob demanda; falha → `null`; ocorrência permanece.
- Sem persistência própria do BacklinkIndex.
- Ordenação: title CI / path; ocorrências line ASC.
- Navegação pública por `line` base 1; sem `column`.

## Critérios da WBS

- [x] Contrato e mapa de paths.
- [x] Reverse Link Index + testes Rust.
- [x] Incremental via reindex/save/watcher existentes.
- [x] IPC + fence + hook FE.
- [x] Painel no shell direito.
- [x] go-to-line + highlight temporário.
- [x] A11y teclado / aria.
- [x] Testes, typecheck, build e Rust verdes.
- [x] Sem grafo.
- [x] Limites honestos documentados.
