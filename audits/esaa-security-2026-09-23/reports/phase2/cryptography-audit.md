# SEC-018 — Auditar Criptografia

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Editor local-first: arquivos Markdown e rascunhos ficam no dispositivo do usuário; hashes SHA-256 são controle de integridade, não criptografia de dados. Sem chaves de aplicação ou transporte HTTP próprio.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| CR-001 HTTPS não obrigatório | not_applicable | Não há serviço HTTP próprio para impor HTTPS. |
| CR-002 Algoritmos criptográficos inseguros | pass | Hash de conteúdo usa SHA-256 para detecção de conflito; busca no código não revelou MD5/SHA1/DES para segurança ou Math.random para segredo. |
| CR-003 Dados sensíveis sem criptografia | partial | Markdown e rascunhos localStorage permanecem em claro por desenho local-first; sensibilidade depende do documento e da proteção do dispositivo. Não há criptografia no app. |
| CR-004 Chaves criptográficas expostas | pass | Busca estática SEC-010 não identificou chave privada/segredo no código rastreado; histórico e artefatos não varridos. |
| CR-005 Falta de rotação de chaves | not_applicable | Sem chave criptográfica própria identificada para rotacionar. |

Fontes inspecionadas: `src-tauri/crates/md-studio-core/src/persistence.rs`, `src/lib/drafts/recovery.ts`, `src-tauri/tauri.conf.json`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
