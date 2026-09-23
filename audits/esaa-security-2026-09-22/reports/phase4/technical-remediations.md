# SEC-040 — Correções técnicas propostas

Escopo: propostas; nenhuma correção de código foi feita nesta auditoria.

Não há finding CRITICAL ou HIGH validado; logo não há seção individual obrigatória nessas faixas. As prioridades MEDIUM/LOW são:

## SEC-022-DO-002-001 — Pipeline sem gates efetivos de segurança e qualidade (MEDIUM)

Origem: `.github/workflows/ci.yml:27`; check `DO-002`. CI não roda auditoria de dependências, secret scan nem SAST; typecheck e testes aceitam falha via || true. É lacuna de detecção, não exploração direta.

Correção proposta: Introduzir gates de pnpm/cargo audit, secret scan e SAST; tornar typecheck/test bloqueantes. Esforço estimado: M.

## SEC-024-FE-002-001 — CSS arbitrário em Markdown pode encobrir a interface (MEDIUM)

Origem: `src/markdown/sanitize.ts:38`; check `FE-002`. Payload com position:fixed e z-index chegou intacto ao HTML e foi interpretado por jsdom. Requer abrir documento não confiável; não há execução JS demonstrada.

Correção proposta: Separar CSS gerado por Shiki do HTML bruto e bloquear position/inset/z-index de conteúdo. Esforço estimado: M.

## SEC-011-DS-002-001 — Dependências Rust transitivas não mantidas (LOW)

Origem: `src-tauri/Cargo.lock:941`; check `DS-002`. cargo audit apontou sete avisos unmaintained; dois avisos unsound requerem avaliação de alcançabilidade. Não há CVE vulnerável confirmada.

Correção proposta: Atualizar árvore transitiva de forma compatível e reexecutar cargo audit/testes. Esforço estimado: M.

## SEC-011-DS-006-001 — CI pode instalar dependências fora do lockfile congelado (LOW)

Origem: `.github/workflows/ci.yml:27`; check `DS-006`. Fallback pnpm install --frozen-lockfile || pnpm install permite resolução não travada; risco de build divergente.

Correção proposta: Remover fallback, usar instalação congelada e toolchain Rust fixada/--locked. Esforço estimado: S.

## SEC-023-DA-003-001 — Rascunhos locais sem prazo de retenção demonstrado (LOW)

Origem: `src/lib/drafts/recovery.ts:7`; check `DA-003`. Rascunhos são gravados em localStorage e clearDraft é pontual; rascunhos abandonados podem permanecer. Exposição depende de acesso ao perfil local.

Correção proposta: Definir prazo e limpeza de rascunhos abandonados; informar usuário sobre armazenamento local. Esforço estimado: S.

## SEC-026-BL-003-001 — Possível TOCTOU entre verificação de hash e rename (INFO)

Origem: `src-tauri/crates/md-studio-core/src/persistence.rs:36`; check `BL-003`. Há janela estática entre checagem de hash e fs::rename; não foi reproduzida corrida nem demonstrado atacante capaz de explorá-la.

Correção proposta: Adicionar teste concorrente e considerar operação por handle/no-follow ou serialização por caminho. Esforço estimado: M.

## Detalhes de implementação prioritários

- CSS: hoje `src/markdown/sanitize.ts` permite `style` em `span`, `code` e `pre`; o pipeline deve remover `style` de HTML bruto antes de Shiki, ou etiquetar estilos gerados por Shiki e permitir só propriedades/valores controlados. Testar `position:fixed`, `inset`, `z-index`, `background-image:url(...)` e cores legítimas do realce.
- CI: substituir `pnpm install --frozen-lockfile || pnpm install` por instalação congelada obrigatória; remover `|| true` de typecheck/teste. Acrescentar gates de auditoria de dependências, segredos e SAST com política de exceções versionada.
- Rascunhos: remover entradas antigas por timestamp e oferecer opção de limpar rascunhos; não apagar dados existentes nesta auditoria.
- TOCTOU: antes de alterar código, criar teste concorrente que modifica o arquivo entre hash e rename; classificar como candidato até reprodução.

Referências gerais: [OWASP ASVS](https://owasp.org/projects/asvs), [NIST SSDF](https://csrc.nist.gov/pubs/sp/800/218/final).
