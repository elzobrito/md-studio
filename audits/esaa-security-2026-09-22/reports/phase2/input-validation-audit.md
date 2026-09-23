# SEC-015 — Validação de entrada (22/09/2026)

Escopo: revisão estática do MD Studio em `f8eaf22` e execução local de payloads no pipeline Markdown. Não houve teste no pacote Tauri nem fuzzing. `reports/phase2/frontend-security-audit.md` documenta o achado de CSS em detalhe.

| Check | Resultado | Evidência e limite |
| --- | --- | --- |
| IV-001 SQL injection | não aplicável | Não há banco SQL ou consultas SQL no aplicativo inspecionado; metadados são índices locais. |
| IV-002 command injection | aprovado para o fluxo inspecionado | `src-tauri/src/commands/formatter.rs` escolhe nomes/argumentos por allowlist e usa `std::process::Command`, não shell. Executáveis são buscados em PATH/locais conhecidos; um binário local já comprometido está fora deste check. |
| IV-003 template injection | não aplicável | Não foram identificados motores de template servidor expostos a entrada do documento. React escapa texto JSX; HTML bruto tem check próprio. |
| IV-004 SSRF | não aplicável | Não foram identificados clientes HTTP server-side controlados por conteúdo Markdown/IPC nos comandos da aplicação. Referências a `reqwest` no lockfile, por si só, não são sink de SSRF. |
| IV-005 XSS | parcial, sem execução de JS provada | `processMarkdown` removeu `onerror` de `<img>` e `javascript:` de links em três payloads de controle. O HTML final entra em `dangerouslySetInnerHTML`; CSS inline sobrevive e merece análise separada. Não se pode generalizar três payloads para ausência de XSS. |
| IV-006 inputs não validados | parcial | `resolve_within` rejeita caminho absoluto, `..` e symlink existente fora da raiz (`src-tauri/crates/md-studio-core/src/workspace.rs`). `search_workspace` não limita tamanho da consulta ou bytes totais lidos; `save_document` aceita conteúdo sem limite explícito. Risco de indisponibilidade local a avaliar com testes de tamanho. |
| IV-007 sanitização ausente/insuficiente | falha confirmada | `src/markdown/sanitize.ts` permite `style` sem restrição em `span`, `code`, `pre`. Payload com `position:fixed;inset:0;z-index:9999;background:red` permaneceu no HTML e foi interpretado por jsdom (`position=fixed`, `zIndex=9999`). Não é prova de execução JS. |
| IV-008 deserialização insegura | aprovado no escopo | Sinks buscados: `pickle.loads`, `yaml.load`, `unserialize`, `ObjectInputStream.readObject`, `Marshal.load`: nenhum no código do produto. `src/markdown/frontmatter.ts` usa `yaml.parse` JS com validação Zod; `JSON.parse` aparece para preferências/rascunhos locais. Não há sink de construção arbitrária de objetos identificado. |
| IV-009 XXE | parcial | Único parser XML explícito encontrado: `DOMParser.parseFromString(svgString, 'image/svg+xml')` em `src/services/diagramExport.ts`; recebe SVG gerado por Mermaid, sem opção de configuração explícita de DTD/entidades. Não há teste dinâmico de busca externa na WebView; não se afirma XXE. |
| IV-010 open redirect | não aplicável | Não foram identificados handlers HTTP de redirect que aceitem URL de entrada; aplicativo é Tauri local. |

Prioridade: corrigir IV-007 preservando CSS legítimo gerado pelo Shiki e introduzir regressões para CSS de posicionamento. Depois, limites de tamanho de entrada e teste WebView de XML/URL conforme ameaça local. A ausência de um sink no código inspecionado não constitui prova universal de segurança.
