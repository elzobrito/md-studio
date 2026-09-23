# Alertas Rust residuais — 2026-09-23

O `Cargo.lock` de `src-tauri` foi atualizado de `event-listener 5.4.1` para
`5.4.2`, removendo o aviso `RUSTSEC-2026-0221`. A auditoria atual encontra
zero vulnerabilidades classificadas como tais, um aviso `unsound` e sete
avisos `unmaintained`; isto não prova que as rotas afetadas sejam exploráveis.

| Aviso | Dependência inversa observada | Decisão temporária |
| --- | --- | --- |
| `RUSTSEC-2024-0429` (`glib 0.18.5`, unsound) | `gtk 0.18` / `webkit2gtk` → Tauri 2 | Exceção específica no gate Rust; não há correção compatível na linha GTK atual. Reavaliar até 2026-10-23. |
| `RUSTSEC-2024-0384` (`instant`) | `notify-types 1.0.1` → `notify 7.0.0` | Informativo; avaliar atualização isolada do watcher sem regressão. Reavaliar até 2026-10-23. |
| `RUSTSEC-2024-0370` (`proc-macro-error`) | macros do GTK/GLib | Informativo; depende da migração da pilha GTK. Reavaliar até 2026-10-23. |
| Cinco avisos `unic-*` | `urlpattern 0.3.0` → `tauri-utils 2.9.3` | Informativos; avaliar substituição no upstream Tauri. Reavaliar até 2026-10-23. |

Responsável pela reavaliação: manutenção do MD Studio. Não ampliar a exceção
`RUSTSEC-2024-0429` para novos avisos. A tarefa de acompanhamento ESAA deve
documentar alcance de uso, versões disponíveis, testes e decisão de migração
Tauri/GTK antes de remover ou renovar a exceção.
