# PRD — Markdown e extensões

## RF-03 — Perfil Markdown

- Base normativa CommonMark + GitHub Flavored Markdown.
- Suportar tabelas, task lists, autolinks, strike-through, notas de rodapé,
  front matter YAML, matemática, diretivas e alertas GitHub.
- O pipeline usa MDAST e HAST; plugins transformam nós, não fazem substituições
  frágeis de HTML por expressão regular.
- Front matter é parseado com parser YAML seguro e validado por schema; chaves
  desconhecidas são preservadas, mas não ganham comportamento privilegiado.
- Diretivas conhecidas viram componentes permitidos. Diretivas desconhecidas
  permanecem legíveis e geram diagnóstico, sem executar código.
- HTML embutido é opcional por perfil e sempre passa pela política de
  sanitização antes de chegar ao React.

## RF-04 — Renderizadores especializados

### Código

- Highlight com conjunto explícito de linguagens e autodetecção desligada.
- Número de linhas, copiar, wrap, nome de arquivo e linhas destacadas são
  metadados validados, nunca HTML livre.
- Falha de linguagem ou metadado preserva o código em texto simples.

### Matemática

- KaTeX para expressões inline e display, com `trust=false` e macros limitadas.
- Erro de sintaxe aparece junto ao bloco sem interromper o restante do documento.
- CSS e fontes são empacotados localmente, sem CDN.

### Mermaid

- Cada bloco possui estado próprio, erro isolado, código-fonte acessível, zoom,
  pan, tela cheia e exportação SVG/PNG.
- Documentos não confiáveis usam `securityLevel: strict` ou sandbox equivalente.
- SVG retornado é sanitizado novamente antes da inserção ou exportação.
- Nenhum clique em diagrama pode executar JavaScript ou abrir protocolo não
  autorizado.

## Contrato de renderização

- Tipo `MarkdownProfile` seleciona capacidades habilitadas.
- Tipo `RenderDiagnostic` contém severidade, código, posição e mensagem segura.
- A mesma entrada e o mesmo perfil devem produzir estrutura determinística.
- Preview e exportação HTML reutilizam o mesmo pipeline e a mesma política de
  sanitização para evitar divergência de segurança ou aparência.
