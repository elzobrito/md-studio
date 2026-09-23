# SEC-024 — Segurança de frontend (22/09/2026)

Escopo: código-fonte do MD Studio em `f8eaf22`, sem alterações no produto. Revisão estática e execução local do pipeline Markdown com Vite SSR; não equivale a um teste completo do aplicativo empacotado.

## FE-001 — tokens em localStorage: sem achado

Busca em `src/` por `localStorage`, `token`, `secret`, `password`, `credential` e `authorization`: o armazenamento local identificado contém preferências, sessão visual, arquivos recentes e rascunhos (`src/state/session.ts`, `src/state/settings.ts`, `src/lib/drafts/recovery.ts`). Não foi identificada autenticação nem token no frontend. Rascunhos podem conter texto sensível; isto é um risco de privacidade local, distinto de token de autenticação.

## FE-002 / IV-005 — CSS arbitrário sobrevive à sanitização: falha confirmada

`src/markdown/processor.ts` aceita HTML bruto e aplica `sanitizePlugin` depois de Shiki/KaTeX. `src/markdown/sanitize.ts` permite `style` livre em `span`, `code` e `pre`. `src/components/MarkdownViewer.tsx` injeta o resultado em `dangerouslySetInnerHTML`. A execução de `processMarkdown('<span style="position:fixed;inset:0;z-index:9999;background:red">Teste</span>')` devolveu `<p><span style="position:fixed;inset:0;z-index:9999;background:red">Teste</span></p>`. Isso permite que um Markdown não confiável encubra/represente partes da interface (UI redressing). Não foi demonstrada execução de JavaScript ou exfiltração. Testes de controle removeram `onerror` de `img` e `javascript:` de links Markdown e HTML.

Impacto: médio, condicionado a abrir arquivo Markdown não confiável. Recomenda-se distinguir estilos gerados pelo Shiki dos estilos fornecidos pelo documento, removendo `style` do HTML bruto antes do realce ou validando propriedades/valores permitidos; manter regressões para CSS de posicionamento e para cores legítimas do Shiki.

## FE-003 / DS-001 — dependências JavaScript: inconclusivo

`pnpm audit --json` não devolveu saída; foi interrompido após 25 segundos (`timeout`, código 124). Assim, não há base para afirmar ausência de vulnerabilidades no ecossistema JS. O check deve ser repetido com acesso estável ao registry e captura de exit code/JSON.

## FE-004 — lógica crítica no frontend: sem falha confirmada

Operações de arquivos do aplicativo passam por comandos Tauri (`src-tauri/src/commands/mod.rs`), incluindo resolução de caminho e gravação nativa; a UI não é autoridade para acesso ao sistema de arquivos. A inspeção foi estática; uma revisão de autorização/capabilities Tauri pertence a checks posteriores.

## SRI/CDN

`index.html` carrega script local `/src/main.tsx`; não há script CDN nessa entrada. Subresource Integrity não se aplica ao script local. Não foi feito inventário de cada asset carregado em runtime.

## Limites

Sem teste no pacote Tauri, sem auditoria JS concluída e sem prova de exploit de XSS. Este resultado cruza FE-002 com IV-005 e FE-003 com DS-001; os checks desses domínios ainda devem ser executados formalmente.
