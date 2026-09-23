# SEC-011 — Dependências e supply chain (22/09/2026)

Escopo: `f8eaf22`, análise do manifesto, lockfiles, CI e execução local de `cargo audit`/`pnpm audit`. Nenhum pacote foi instalado ou atualizado.

## DS-001 — vulnerabilidades conhecidas: parcial

`cargo audit --json` sobre `src-tauri/Cargo.lock` (489 pacotes, banco RustSec atualizado em 22/09/2026) retornou `vulnerabilities.count=0`. O mesmo resultado registrou dois avisos `unsound`: `event-listener 5.4.1` / RUSTSEC-2026-0221 (corrigido em >=5.4.2) e `glib 0.18.5` / RUSTSEC-2024-0429 (afetando métodos específicos de `VariantStrIter`, corrigido em >=0.20.0). `cargo tree -i` ligou `event-listener` a `zbus`/plugins Tauri e `glib` a GTK/WebKit. Presença transitiva não demonstra chamada às APIs afetadas nem exploração; exigem revisão de alcançabilidade/atualização compatível.

`pnpm audit --json` não retornou dados: primeira tentativa foi interrompida após aproximadamente um minuto; repetição com `timeout 25s` terminou com código 124 e saída vazia. Portanto, vulnerabilidades JS permanecem desconhecidas. O check não é aprovado por ausência de resultado.

## DS-002 — manutenção: falha de higiene

O RustSec listou sete dependências transitivas não mantidas: `instant 0.1.13`, `proc-macro-error 1.0.4` e cinco pacotes `unic-* 0.9.0`. São avisos informativos de manutenção, não sete vulnerabilidades exploráveis. Avaliar substituições via árvore de dependências e atualização compatível.

## DS-003 — typosquatting: nenhuma suspeita observada, confiança baixa

Inspeção heurística dos nomes de dependências diretas em `package.json` e `src-tauri/Cargo.toml` não revelou variantes óbvias de marcas conhecidas. Não houve consulta reputacional a registry; o resultado não certifica a procedência de todas as transitivas.

## DS-004 — lockfiles: aprovado

`pnpm-lock.yaml`, `src-tauri/Cargo.lock` e `src-tauri/crates/md-studio-core/Cargo.lock` estão presentes. A presença não garante uso obrigatório de versões travadas em todo build.

## DS-005 — auditoria contínua: falha

`.github/workflows/ci.yml` executa build, typecheck e testes, mas não `pnpm audit`/`cargo audit` nem outro gate de advisories. Em particular, `pnpm typecheck || true` e `pnpm test || true` não bloqueiam CI. O workflow Windows também não tem gate de dependências. Recomenda-se auditorias com política clara de exceções e falha de CI para achados acionáveis.

## DS-006 — build reproduzível: falha

`.github/workflows/ci.yml` usa `pnpm install --frozen-lockfile || pnpm install`: se o lockfile congelado falhar, o CI prossegue com resolução não congelada. O Rust está em `dtolnay/rust-toolchain@stable` e `cargo test` não usa `--locked`. O workflow Windows usa `--frozen-lockfile`; Snap também, mas o comportamento do CI principal é divergente. Ações de GitHub são referidas por tags, não por SHA; isso também limita reprodutibilidade estrita. Remover fallback e fixar toolchains/ações conforme política de release.

## Limites e prioridades

Prioridade 1: repetir auditoria JS em ambiente com registry responsivo. Prioridade 2: resolver fallback de lockfile e gates de CI. Prioridade 3: avaliar atualização das dependências transitivas Rust e alcançabilidade dos dois avisos `unsound`. Esta revisão não inspecionou o conteúdo de todos os scripts de instalação transitivos nem produziu SBOM completo.
