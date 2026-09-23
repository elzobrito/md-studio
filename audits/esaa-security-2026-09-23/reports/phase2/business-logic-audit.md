# SEC-026 — Auditar Lógica de Negócio e Anti-Automação

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Fluxos críticos reais: abrir workspace, salvar documento e exportar HTML. Não há pagamento, cadastro, cupom, transferência ou transação financeira.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| BL-001 Bypass de workflow multi-step | partial | save_document usa expected_hash, mas export_html aceita overwrite=true do renderer e destino absoluto; confirmação está na UI, não no backend. Exige webview comprometida/ação local. |
| BL-002 Anti-automação ausente em fluxos críticos | not_applicable | Sem fluxo crítico remoto/pagamento/login sujeito a bots. |
| BL-003 Race conditions (TOCTOU) em operações sensíveis | partial | atomic_save verifica hash e depois renomeia arquivo; mudanças concorrentes entre check e rename podem ser sobrescritas. resolve_within canonicaliza antes de I/O, sem nofollow no uso subsequente. TOCTOU plausível, não reproduzido. |
| BL-004 Abuso de fluxo de negócio permitido | not_applicable | Sem regras comerciais de preço/cupom/crédito; abuso do fluxo local depende de privilégios já existentes no host. |

Fontes inspecionadas: `src-tauri/src/commands/mod.rs`, `src-tauri/crates/md-studio-core/src/persistence.rs`, `src-tauri/crates/md-studio-core/src/workspace.rs`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
