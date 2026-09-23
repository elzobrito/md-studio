# SEC-020 — Auditar Logs e Monitoramento

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Inspeção de pontos console.* e logs Rust. App local sem servidor ou requisições distribuídas; não há telemetria central de segurança identificada.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| LM-001 Logs contendo dados sensíveis | partial | Sem log explícito de token/env; console.error de objetos de erro pode conter caminhos/documentos. Detalhe em SC-008. |
| LM-002 Ausência de logs de auditoria | not_applicable | Não há contas/ações administrativas remotas que requeiram trilha de auditoria; eventos ESAA são governança de desenvolvimento, não logs do app. |
| LM-003 Logs não estruturados | partial | Logs observados são console.error/console.warn livres, sem schema. Impacto local; não há pipeline central. |
| LM-004 Ausência de alertas de segurança | not_applicable | Sem serviço de produção/monitoramento remoto operado pelo app; alertas do host ficam fora do repo. |
| LM-005 Ausência de correlação de requisições | not_applicable | Sem requests HTTP distribuídos para correlacionar. |

Fontes inspecionadas: `src/App.tsx`, `src/state/documentState.ts`, `src/components/MarkdownViewer.tsx`, `src-tauri/src/lib.rs`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
