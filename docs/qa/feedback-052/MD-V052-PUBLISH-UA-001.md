# MD-V052-PUBLISH-UA-001 — UA de publicação 0.5.2

User acceptance da linha 0.5.2 após `MD-V052-RELEASE-001` (done). Nenhum `src/**` editado nesta tarefa. Sem commit, tag, push, GitHub Release ou Snap Store.

Data da conferência: 2026-10-05. Actor: `agent-qa`. Runtime: `grok`.

## Decisão

**Publicação externa BLOQUEADA.** A preparação local 0.5.2 está íntegra (versão, hashes, quatro correções no artefato instalado). Git tag/push, GitHub Release e Snap Store **não** foram feitos neste runtime.

Motivo: a working tree mistura a linha 0.5.2 com resíduo pós-0.5.1 (scripts de rebuild/hotfix, receipts, overlay ESAA). A política da campanha proíbe commit automático desse conjunto. Sem commit seletivo do operador não há SHA publicável, tag `v0.5.2` nem artefato `.snap` 0.5.2.

## Versão no artefato instalado

| Fonte | Valor |
|---|---|
| `package.json` | 0.5.2 |
| `src-tauri/tauri.conf.json` | 0.5.2 |
| `src-tauri/Cargo.toml` | 0.5.2 |
| `snap/snapcraft.yaml` | 0.5.2 |
| `dpkg-deb -f …/MD Studio_0.5.2_amd64.deb Version` | 0.5.2 |
| `dpkg-deb -f … Package` | md-studio |
| `~/.local/bin/md-studio` | 24636576 bytes, SHA-256 `3bc1d90049bb2148f4ac1936e4c3f0f82df982da0ebf64fce967b46df8833532` |

O launcher do menu Ubuntu aponta para esse binário:

```
Exec=/usr/bin/env GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 /home/elzobrito/.local/bin/md-studio %F
```

`GDK_BACKEND=x11` permanece no `.desktop` (LES-0004 / INV-DESKTOP-LAUNCHER-ENV). Não foi injetado no runtime Rust. `WEBKIT_DISABLE_DMABUF_RENDERER=1` e `%F` permanecem.

## Hashes contra MD-V052-RELEASE-001

Conferidos em 2026-10-05 contra a tabela do relatório de RELEASE. Coincidência byte a byte.

| Artefato | Bytes | SHA-256 | vs RELEASE |
|---|---|---|---|
| `src-tauri/target/release/md-studio` | 24636576 | `3bc1d90049bb2148f4ac1936e4c3f0f82df982da0ebf64fce967b46df8833532` | igual |
| `~/.local/bin/md-studio` | 24636576 | `3bc1d90049bb2148f4ac1936e4c3f0f82df982da0ebf64fce967b46df8833532` | igual |
| `MD Studio_0.5.2_amd64.deb` | 11977004 | `b4bf64327d3b198358e241f650cf7056fc24467f3f933d7f085b7c1cab50a30b` | igual |
| `MD Studio-0.5.2-1.x86_64.rpm` | 11979931 | `b8e8e471291f0223389a764bf1c7d71ef4b846598411e72c106bc35d7b7fe05d` | igual |
| `MD Studio_0.5.2_amd64.AppImage` | 101078208 | `18a437a6848e316dff8dc20e1680860a6fca26205e1a94046f5632cab4d9a511` | igual |

## Checklist UA das quatro correções

O binário Tauri embute `dist/` no compile. Conferência no bundle Vite da build 0.5.2 (`dist/assets/index-DL6dgSTP.js` e `index-Cp0AUl3D.css`) mais os testes da QA `MD-UX-FEEDBACK-QA-001` (10 arquivos, 49 testes, typecheck 0).

| Entrega | O que o tester pediu | Evidência no artefato 0.5.2 | Resultado |
|---|---|---|---|
| KaTeX visível | Matemática GitHub `$` / `$$` legível no Formatado | `index-DL6dgSTP.js` contém `katex`; `index-Cp0AUl3D.css` contém fontes/regras KaTeX; `src/main.tsx` importa `katex/dist/katex.min.css` | pass |
| Novo documento | `+` / Ctrl+N cria em branco; não substitui dirty sem confirmar; ícone distinto da árvore | `index-DL6dgSTP.js` contém `Criar em branco` e `Novo documento` | pass |
| Sumário no modo atual | Clique no TOC em Markdown **não** força Formatado | `index-DL6dgSTP.js` contém `goToLine`; `goToHeading` não chama `setViewMode` (QA `outline-navigation.test.tsx`) | pass |
| Inserir equação | Botão exclusivo Equação (GitHub/LaTeX + paleta) | `index-DL6dgSTP.js` contém `Equação` | pass |

Limitação já registrada na QA: `$$` isolado em linha própria ainda pode virar bloco Shiki `language-text`. Fora desta UA.

Smoke GUI interativo do binário (LES-0006, pixels/DOM) **não** foi reexecutado nesta UA. A prova de conteúdo das quatro correções é o bundle embutido + suíte da QA. Processo vivo da janela não entra como evidência.

## Git tag / push — BLOQUEADO

| Item | Evidência |
|---|---|
| HEAD local | `b5e2cab8df4c9de9e3b620a094b615403c9cc097` — `chore(esaa): consolidar hotfixes de interface pós-0.5.1` |
| `origin/main` | `6dfd99840a9a87f79bc6eb8acf089bdeca374190` |
| ahead | `main...origin/main [ahead 1]` — o commit à frente **não** é a 0.5.2; a 0.5.2 está no overlay sujo |
| porcelain | 62 entradas (tracked + untracked) |
| tag local `v0.5*` | vazia (`git tag -l 'v0.5*'` sem saída) |
| tags remotas | só `v0.1.0` … `v0.2.3`; sem `v0.5.0`/`v0.5.1`/`v0.5.2` |
| `gh auth` | `elzobrito` logado; scopes `gist, read:org, repo, workflow` |

A árvore mistura:

- produto 0.5.2 (manifestos, `src/**`, testes, `docs/qa/feedback-052/`, `docs/release/RELEASE_NOTES_v0.5.2.md`, `CHANGELOG.md`);
- store ESAA (`.roadmap/*.json` / `activity.jsonl`);
- resíduo pós-0.5.1 que a consolidação deixou de propósito (`scripts/rebuild-test.sh`, `scripts/rebuild-test-fixed.sh`, `scripts/esaa-hotfix-workspace-containment.sh`, receipts `docs/qa/post051/`).

Commit/tag/push **não** foram emitidos. LES-0005 (`bash scripts/security-gates.sh` antes de qualquer push em `main`) **não** rodou porque não houve push. CI dos três workflows **não** existe para um SHA 0.5.2: esse SHA ainda não foi criado.

## GitHub Release — BLOQUEADO

`gh release list --repo elzobrito/md-studio --limit 5`:

| Release | Tag | Data |
|---|---|---|
| MD Studio v0.2.2 — Lançamento Global (Linux & Windows) | **Latest** `v0.2.2` | 2026-09-23 |
| v0.2.1 | v0.2.1 | 2026-09-23 |
| MD Studio v0.2.0 | v0.2.0 | 2026-09-22 |
| MD Studio v0.1.0 | v0.1.0 | 2026-09-20 |

Pública permanece 0.2.2. Credencial `gh` existe; release 0.5.2 **não** foi criada.

## Snap Store — BLOQUEADO

`snapcraft whoami`: `elzobrito`, permissões `package_push`/`package_release`, expira 2027-09-22.

`snapcraft revisions md-studio`:

| Rev | Uploaded | Version | Channels |
|---|---|---|---|
| 6 | 2026-09-29T02:55:30Z | **0.5.1** | `latest/stable*` |
| 5 | 2026-09-29T00:16:43Z | 0.5.0 | `latest/stable` |
| 4 | 2026-09-25T20:59:53Z | 0.2.3 | candidate/edge/stable |
| 3 | 2026-09-23T17:40:46Z | 0.2.2 | candidate/edge/stable |

Snaps locais no repo: `md-studio_0.2.0` … `md-studio_0.5.1_amd64.snap`. **Nenhum** `md-studio_0.5.2_amd64.snap`. `pnpm tauri build` gerou deb/rpm/AppImage; não gerou `.snap`. Upload **não** foi tentado.

## O que o operador precisa para publicar

1. Selecionar o conjunto 0.5.2 (produto + store ESAA + notas) **sem** os scripts de rebuild/hotfix.
2. Commit convencional, tag `v0.5.2`, `bash scripts/security-gates.sh` (LES-0005), push `main` + tag.
3. Esperar CI verde nos três workflows no SHA exato.
4. `gh release create v0.5.2` com deb/rpm/AppImage e `docs/release/RELEASE_NOTES_v0.5.2.md`.
5. Construir o snap 0.5.2 e `snapcraft upload --release=stable`.

Esta UA **não** executa esses passos.

## Aceite desta tarefa

| Critério | Estado |
|---|---|
| Relatório confirma versão 0.5.2 no artefato instalado | cumprido (`dpkg-deb` + SHA `~/.local/bin/md-studio`) |
| Checklist UA: katex, novo documento, sumário, equação | cumprido no bundle 0.5.2 |
| Hashes conferidos contra MD-V052-RELEASE-001 | cumprido, cinco artefatos iguais |
| Estado de git tag/push e Snap Store documentado com evidência (feito ou bloqueado) | cumprido: **BLOQUEADO** nos três canais |

Veredito: **UA local PASS; publicação externa BLOCKED.**
