# SEC-023 — Auditar Segurança de Dados

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Dados principais são Markdown do usuário em pasta escolhida; rascunhos ficam em localStorage. Não há backend multiusuário ou coleta analítica própria identificada.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| DA-001 Dados sensíveis armazenados sem proteção | partial | Campos potencialmente pessoais: conteúdo Markdown, nomes/caminhos de arquivo, rascunhos, histórico recente e metadados de índice. Rascunhos localStorage não são criptografados; proteção depende do host. |
| DA-002 Dados excessivos armazenados | partial | Recentes e índice persistem paths/metadados; necessidade/minimização por campo não foi documentada. Sem evidência de envio remoto. |
| DA-003 Ausência de política de retenção | partial | clearDraft remove rascunho após fluxo de save, mas rascunhos abandonados não têm TTL ou limpeza periódica demonstrada. |
| DA-004 Ausência de anonimização | not_applicable | Sem analytics/relatório agregado ou dataset de terceiros que demande anonimização no produto. |
| DA-005 Não conformidade com LGPD/GDPR | partial | Conformidade LGPD/GDPR depende de finalidade, distribuição e operação do usuário; código não basta para atestar conformidade ou infração. |

Fontes inspecionadas: `src/lib/drafts/recovery.ts`, `src/state/recent-files.ts`, `src-tauri/crates/md-studio-core/src/index/index_persistence.rs`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
