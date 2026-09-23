# Relatório final de auditoria de segurança — MD Studio

Run: `RUN-SEC-MD-STUDIO-2026-09-22` · Base de código: `f8eaf22` · Score estático: **62.25/100 (fair)**

## Síntese

Postura estática regular: sanitização HTML bloqueou payloads JS comuns, mas CSS de Markdown arbitrário foi reproduzido; CI tem lacunas de segurança e reprodutibilidade. Nenhum CRITICAL/HIGH validado. O score não certifica segurança em runtime.

Cobertura: **17 domínios / 108 checks** — 15 pass, 8 fail, 25 partial, 60 N/A. Dos oito checks fail surgiram quatro questões consolidadas; há duas observações condicionais. Nenhum finding CRITICAL/HIGH validado.

## Riscos priorizados

| ID | Severidade | Evidência | Ação |
| --- | --- | --- | --- |
| `SEC-022-DO-002-001` | MEDIUM | `.github/workflows/ci.yml:27` · `DO-002` | Introduzir gates de pnpm/cargo audit, secret scan e SAST; tornar typecheck/test bloqueantes. |
| `SEC-024-FE-002-001` | MEDIUM | `src/markdown/sanitize.ts:38` · `FE-002` | Separar CSS gerado por Shiki do HTML bruto e bloquear position/inset/z-index de conteúdo. |
| `SEC-011-DS-002-001` | LOW | `src-tauri/Cargo.lock:941` · `DS-002` | Atualizar árvore transitiva de forma compatível e reexecutar cargo audit/testes. |
| `SEC-011-DS-006-001` | LOW | `.github/workflows/ci.yml:27` · `DS-006` | Remover fallback, usar instalação congelada e toolchain Rust fixada/--locked. |
| `SEC-023-DA-003-001` | LOW | `src/lib/drafts/recovery.ts:7` · `DA-003` | Definir prazo e limpeza de rascunhos abandonados; informar usuário sobre armazenamento local. |
| `SEC-026-BL-003-001` | INFO | `src-tauri/crates/md-studio-core/src/persistence.rs:36` · `BL-003` | Adicionar teste concorrente e considerar operação por handle/no-follow ou serialização por caminho. |

O achado de CSS junta FE-002 e IV-007. A lacuna de CI junta DO-002/003/004 e DS-005; duplicações não foram contadas como vulnerabilidades independentes. O possível TOCTOU é **INFO/candidato**, sem reprodução dinâmica.

## Testes e limites

- `cargo audit --json`: zero vulnerabilities; sete avisos unmaintained e dois unsound transitivos. A alcançabilidade dos avisos não foi comprovada.
- `pnpm audit --json`: timeout sem saída em duas tentativas; dependências JS **não estão liberadas** por esta auditoria.
- Probe do pipeline Markdown: `style="position:fixed;inset:0;z-index:9999;background:red"` sobreviveu à sanitização e foi interpretado por jsdom; `onerror` e `javascript:` foram removidos nos payloads de controle. Não há prova de execução JS nem teste do pacote Tauri.
- Sem scanner de segredos/SAST/DAST completo; infraestrutura externa, proteção de branch e LGPD não foram atestadas.
- O HEAD avançou de `f8eaf22` a `c9b9561` em README, ícones e governança; não houve mudança no código de segurança auditado entre essas revisões.

## Score e cobertura

Fórmula: pass=weight; partial=0.5*weight; fail/error=0; N/A excluded; weighted mean by domain priority; penalty caps applied. Resultado: 1618.42 / 26.0 = 62.25. Domínios inteiramente N/A não entram na média. Score é uma métrica de checklist estático, não risco residual absoluto.

| Domínio | Score | Pass/Fail/Partial/N/A |
| --- | ---: | --- |
| secrets_config | 91.67 | 5/0/1/2 |
| dependencies_supply_chain | 60.34 | 2/3/1/0 |
| authentication | N/A | 0/0/0/9 |
| authorization | 65.62 | 1/0/3/2 |
| api_security | 65.91 | 1/0/3/5 |
| input_validation | 64.44 | 2/1/3/4 |
| file_upload | N/A | 0/0/0/6 |
| session_security | N/A | 0/0/0/6 |
| cryptography | 85.42 | 2/0/1/2 |
| security_headers | 50.0 | 0/0/1/4 |
| logging_monitoring | 50.0 | 0/0/2/3 |
| infrastructure | 50.0 | 0/0/1/6 |
| devsecops | 17.39 | 0/3/2/1 |
| data_security | 50.0 | 0/0/4/1 |
| frontend_security | 62.5 | 2/1/1/0 |
| ai_llm_security | N/A | 0/0/0/7 |
| business_logic | 50.0 | 0/0/2/2 |

## Rastreabilidade e próximos passos

Os 17 resultados de domínio estão em `reports/phase2/results/SEC-*.json`; inventário, classificação e matriz em `reports/phase3/`; propostas e boas práticas em `reports/phase4/`. Cada linha da matriz JSON contém `source_result` e `check_id` verificáveis.

1. Corrigir CSS arbitrário e adicionar regressões no WebView real.
2. Endurecer CI e repetir auditoria JS com registry responsivo.
3. Revisar avisos RustSec e retenção de rascunhos; testar corrida de save antes de classificar TOCTOU como vulnerabilidade.

Fontes de orientação: [OWASP ASVS](https://owasp.org/projects/asvs), [NIST SSDF](https://csrc.nist.gov/pubs/sp/800/218/final), [CIS Controls v8](https://www.cisecurity.org/controls/cis-controls-navigator/v8).

**Nota de contrato:** o template de relatório 1.1.0 exige `roadmap_schema_version=0.4.0`, mas a instância ESAA gerou `0.4.1`. O JSON final registra o valor real e a divergência, sem falsificar metadados. A estrutura, os campos e a rastreabilidade foram validados; compatibilidade literal com essa constante obsoleta não foi alegada.
