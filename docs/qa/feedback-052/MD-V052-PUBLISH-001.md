# MD-V052-PUBLISH-001 — publicação git + Snap Store 0.5.2

Operador autorizou commit/push e publicação no Snap após a UA `MD-V052-PUBLISH-UA-001` (BLOCKED). Actor `agent-impl`, runner `grok`. Data: 2026-10-05.

## Git

| Item | Valor |
|---|---|
| HEAD | `c6884de365aa44c2d81068d0e0bfa41c56e0b9b1` |
| Mensagem | `release: publish MD Studio 0.5.2` |
| Tag | `v0.5.2` (anotada, aponta para `c6884de`) |
| `origin/main` | `6dfd998..c6884de` (dois commits: `b5e2cab` pós-0.5.1 + `c6884de`) |
| Fora do commit | `scripts/rebuild-test.sh`, `scripts/rebuild-test-fixed.sh`, `scripts/esaa-hotfix-workspace-containment.sh` |

`snap-bin/bin/md-studio` no commit: SHA-256 `3bc1d90049bb2148f4ac1936e4c3f0f82df982da0ebf64fce967b46df8833532` (mesmo binário da RELEASE).

## LES-0005

`bash scripts/install-security-tools.sh` (instala gitleaks 8.28.0 + semgrep 1.140.0 e corre `security-gates.sh`) saiu 0 **antes** do `git push`.

- `pnpm test`: 133 arquivos, 774 testes
- `pnpm typecheck`, `pnpm audit --audit-level high`, `cargo audit` (deny unsound), gitleaks, semgrep: ok

## Snap Store

`snapcraft pack --use-lxd` falhou: a API `api.snapcraft.io` devolveu HTTP 500 em loop (core24 / gtk-common-themes / gnome-46-2404) dentro do container. O payload 0.5.2 foi empacotado a partir do snap 0.5.1 (mesmo `dump` + extensão gnome): binário 0.5.2 + `meta/snap.yaml` `version: 0.5.2`.

| Artefato | Valor |
|---|---|
| Arquivo | `md-studio_0.5.2_amd64.snap` (gitignore; 10739712 bytes) |
| SHA-256 do snap | `0d6512b98d3896a896562535b2e894d26f23ed386205494ee5a4490991aeca79` |
| Binário interno | 24636576 bytes, SHA `3bc1d900…3532` |
| Upload | `snapcraft upload --release=stable` |
| Store | **latest/stable = 0.5.2 rev 7** (2026-10-05T19:53:37Z) |

`snap install md-studio` no canal stable passa a puxar 0.5.2.

## CI GitHub

Push de `main` e da tag `v0.5.2` disparou `ci`, `Build Linux App` e `Build Windows App`. No momento do complete ainda estavam `in_progress`/`queued` (SHA `c6884de`). Os bundles `.deb`/AppImage/Windows da GitHub Release saem desses workflows quando a tag verde.

## Aceite

| Critério | Estado |
|---|---|
| `security-gates.sh` local antes do push | cumprido (via `install-security-tools.sh`, saída 0) |
| Commit na main sem scripts de rebuild/hotfix | cumprido (`c6884de`, scripts continuam untracked) |
| Tag `v0.5.2` em origin | cumprido |
| Snap 0.5.2 em `latest/stable` | cumprido (rev 7) |

Veredito: **publicado**. GitHub Release de anexos depende da CI da tag.
