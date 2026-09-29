# Delta anotado do TCG — ISSUE-MD-SEC-GIT2-ADVISORY-001 (git2 0.20.4 unsound)

**Artefato:** `.esaa/traceability/sec-git2-graph-delta.md`
**Data:** 2026-09-27 (~15:05 BRT)
**Autor:** Grok (runner ESAA `grok`, actor `agent-qa`), a pedido do Elzo
**Vínculos ESAA:** `ISSUE-MD-SEC-GIT2-ADVISORY-001` (EV-00004025, reportada em `MD-V04-039`), lição `LES-0005` (EV-00004028, via `ISSUE-MD-PROC-SECURITY-GATE-PREPUSH-001` em `MD-V04-QA-001`), recorrência de `MD-SEC-AUDIT-CI-001`
**Baseline:** G3, `source_commit` **inalterado** = `2e5cce855888b404654002fef1d97ebc0db29cf7` (todas as âncoras/evidências abaixo existem nesse commit; `b13ad6b`, que introduziu git2, é ancestral dele)
**Aplicação:** `python3 .esaa/traceability/tools/apply_sec_git2_delta.py` (padrão de `reconcile_g3.py`, porém append-only, idempotente e com checagem das âncoras via `git show <SC>:<path>` antes de gravar; não re-serializa os YAML)

---

## 1. Contexto

- Push de 27/09 14:10 BRT levou `b13ad6b` (feat v0.4) + `2e5cce8`; CI roda só no head e falhou nos 3 workflows (runs 36335999915 / 36335999933 / 36335999969; job 108666841445): `cargo audit --deny unsound` → git2 0.20.4 RUSTSEC-2026-0183 e RUSTSEC-2026-0184.
- `b13ad6b` adicionou `git2 = { version = "0.20", default-features = false }` (`md-studio-core/Cargo.toml:20`) e git2 0.20.4 nos dois lockfiles. Os advisories estão na advisory-db desde 17/06/2026 (patched `>= 0.21.0`; git2 0.21.0 no crates.io desde 18/05/2026). A hipótese "advisory novo entre runs" foi refutada.
- `cargo tree -i git2 --locked`: `git2 v0.20.4 <- md-studio-core v0.2.3 <- md-studio v0.2.3` (direta em md-studio-core; `libgit2-sys 0.18.8+1.9.7`).

## 2. Escolha de modelagem: dependência externa

`schema.yaml` não tem tipo de nó para dependência externa (crate). Mecanismo mais próximo adotado: **`configuration` (CFG)** — "configuração que altera comportamento… constantes de política" — ancorado na **linha de declaração** da dependência no `Cargo.toml` (símbolo `git2`, verificável pela regra de âncora do validate). Versão resolvida, advisories e versão corrigida ficam em `notes` + `tags` (`external_dependency`, `rust_crate`, `rustsec_advisory`, `denied_by_cargo_audit`) — sem campos fora do schema. Dados estruturados (advisories, lockfile:linha, patched) ficam no spec de análise `.esaa/analysis/ISSUE-MD-SEC-GIT2-ADVISORY-001-traceability.yaml`.
Proposta (não aplicada): tipo `external_dependency` (prefixo `DEP`) com campos `ecosystem`, `resolved_version`, `lockfile_refs`, `advisories[]`, `patched`, em uma próxima revisão de schema.

## 3. Itens adicionados

| Tipo | Id | Âncora / evidência (em 2e5cce8) | Notas |
|---|---|---|---|
| nó `configuration` | `CFG-RS-DEP-GIT2` | `src-tauri/crates/md-studio-core/Cargo.toml:20` (`git2`) | módulo `MOD-SECURITY-POLICY`; lock: `src-tauri/Cargo.lock:1415`, `src-tauri/crates/md-studio-core/Cargo.lock:327` |
| nó `class` | `CLS-GIT-PROVIDER` | `src-tauri/crates/md-studio-core/src/git.rs:46-287` (`GitProvider`) | módulo provisório `MOD-WORKSPACE-FS` (não há `MOD-GIT`) |
| aresta `depends_on` | `CLS-GIT-PROVIDER\|depends_on\|CFG-RS-DEP-GIT2` | `git.rs:1`, `git.rs:13`, `git.rs:192`, `git.rs:272`, `Cargo.toml:20` | observed |
| invariante | `INV-NO-DENIED-DEPENDENCY-ADVISORY` | enforced_by `scripts/security-gates.sh:9-10`, `.github/workflows/security-gates.yml:29`, `ci.yml:7`, `build-linux.yml:18`, `build-windows.yml:18` | `coverage: none`, `gap: true`; gap 1 = **violada em 2e5cce8** (git2 0.20.4); gap 2 = verificação é script de CI, não teste catalogado |

Resumo de `invariants.yaml` atualizado (total 12; none 4; listas `without_tests`/`with_gap`). Os `summary` de `nodes.yaml`/`edges.yaml` não foram recalculados (já estavam defasados antes deste delta: 516/909 declarados vs 554/961 reais) para não reescrever metadados da baseline G3.

## 4. Lacunas registradas (não inventadas no grafo)

1. **history.rs não usa git2** (grep em 2e5cce8: só `crate::persistence`, serde, std, thiserror). Nenhuma aresta history.rs → git2 foi criada; o pedido original previa uma, mas não há evidência.
2. **Sem features/fluxos para Git e History na G3**: não existem `FEAT-*`, `FLOW-*`, `ENT-*`, `IPC-*` para `MD-V04-039` (Git enxuto) nem `MD-V04-026` (Local History). Por isso não há arestas de git.rs/history.rs para fluxos/features; o fechamento de impacto para em `CLS-GIT-PROVIDER`.
3. **IPC git_\* não catalogados**: `src-tauri/src/commands/mod.rs:261-318` (`git_is_repository`, `git_get_status`, `git_get_file_diff`, `git_get_file_history`, `git_get_file_at_commit`) e clientes TS. Consequência: `CLS-GIT-PROVIDER` aparece em `orphan_services` (warning esperado).
4. **Testes Git não catalogados** (`tests/git/git-gutter.test.ts`, testes Rust do provider): `must_run` vazio na projeção.
5. Uso da API afetada: git.rs **não** chama `Remote::list()` nem `Blame::blame_buffer`; exposição prática provavelmente nula, mas a correção é subir para 0.21 (há versão corrigida), sem exceção no audit.

## 5. Validação

- `python3 .esaa/traceability/tools/build_graph.py` → rc 0; `graph.json` 777 nós / 2622 arestas (antes 774 / 2618), `source_commit` 2e5cce8.
- `python3 .esaa/traceability/tools/validate.py` → **pass**, critical 0, warning 27 (antes 25 com o drift de HEAD 6fbe64a): +1 `orphan_services` (`CLS-GIT-PROVIDER`), +1 `invariants_with_gap` (`INV-NO-DENIED-DEPENDENCY-ADVISORY`). `source_commit_drift` (HEAD 6fbe64a ≠ 2e5cce8) é pré-existente.
- Análise de impacto: `.esaa/analysis/ISSUE-MD-SEC-GIT2-ADVISORY-001-impact.yaml` (spec `…-traceability.yaml`).
