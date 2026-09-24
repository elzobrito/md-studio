# PRD — Qualidade, segurança e distribuição

## RF-07 — Publicação

- Exportar HTML autocontido ou com pasta de assets, mantendo a aparência do
  preview e registrando recursos que não puderam ser incluídos.
- Impressão usa folha CSS própria e o diálogo do sistema para PDF; não promete
  paginação acadêmica determinística na v1.
- Diagramas Mermaid exportam SVG sanitizado e PNG derivado do SVG já validado.
- Exportação nunca sobrescreve arquivo existente sem confirmação.

## RNF-SEC-01 — Segurança

- CSP restritiva, sem `unsafe-eval`, scripts remotos ou CDN.
- Lista explícita de protocolos para links; links externos abrem pelo opener do
  Tauri com isolamento e confirmação configurável.
- Backend canonicaliza caminhos, limita operações à raiz autorizada e valida
  symlinks em cada operação sensível.
- Sanitização cobre HTML, SVG, atributos, URLs, MathML e saída Mermaid.
- Logs não contêm conteúdo integral do documento, tokens, variáveis de ambiente
  ou caminhos pessoais além do necessário para diagnóstico local explícito.
- Limites de tamanho, profundidade e tempo evitam congelamento por documento,
  árvore, busca ou diagrama malicioso.

## RNF-DATA-01 — Integridade

- Escrita atômica e detecção otimista de concorrência por hash/mtime.
- Rascunhos possuem versionamento mínimo, checksum e limpeza conservadora.
- Falha, crash ou falta de espaço não pode substituir o arquivo válido por um
  arquivo parcial.
- Testes cobrem conflito, remoção, rename, encoding inválido e interrupção entre
  escrita temporária e rename.

## RNF-PERF-01 — Desempenho

- Operações de filesystem, busca e Mermaid não bloqueiam a thread da UI.
- Busca e watcher aceitam cancelamento e backpressure.
- Preview usa debounce e preserva resposta do editor durante digitação.
- Definir benchmarks reproduzíveis para documento grande, workspace grande e
  diagrama complexo antes da release candidata.

## RNF-A11Y-01 — Acessibilidade

- Fluxos principais operáveis por teclado, foco sempre visível e ordem lógica.
- Painéis, árvore, editor, preview, outline, diálogos e alertas possuem nomes e
  papéis acessíveis.
- Tema claro/escuro respeita contraste; animações respeitam redução de movimento.
- Diagnósticos não dependem apenas de cor.

## RNF-PORT-01 — Plataforma e release

- Aceite multiplataforma: **Linux** (Snap Store `stable`, `.deb`, AppImage, `.rpm`) e **Windows** (NSIS `.exe`, MSI). Ubuntu/Linux permanece referência de QA Linux; artefatos oficiais alinhados ao release v0.2.2 (ver `docs/release/PACKAGING.md`).
- Fronteiras Tauri/React não assumem separador de caminho, shell ou URI de um único SO.
- Build é reproduzível com versões fixadas; nenhuma dependência permanece em
  `latest`.
- Testes incluem Rust, Vitest e E2E WebDriver do Tauri, além de inspeção dos
  pacotes instaláveis em ambiente limpo.
