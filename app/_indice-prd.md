# Índice de requisitos — MD Studio v1

| ID | Resumo | Fonte principal |
|---|---|---|
| RF-01 | Abertura de arquivo/pasta, drag-and-drop e árvore do workspace | PRD Core |
| RF-02 | Edição, salvamento explícito, conflito e recuperação de rascunho | PRD Core |
| RF-03 | CommonMark, GFM, front matter, notas, alertas e diretivas | PRD Extensions |
| RF-04 | Código, KaTeX e Mermaid | PRD Extensions |
| RF-05 | Assets, links relativos, âncoras e navegação entre Markdown | PRD Core/Extensions |
| RF-06 | Busca, watcher, sumário, sessão, preferências e temas | PRD Core |
| RF-07 | HTML, impressão/PDF e exportação de diagramas | PRD Quality |
| RNF-SEC-01 | Sanitização, CSP, protocolos e fronteira do filesystem | PRD Quality |
| RNF-DATA-01 | Escrita atômica, integridade e recuperação | PRD Core/Quality |
| RNF-PERF-01 | Limites, responsividade, busca e renderização | PRD Quality |
| RNF-A11Y-01 | Teclado, foco, contraste e semântica | PRD Quality |
| RNF-PORT-01 | Linux prioritário e arquitetura portável | PRD Quality |

## Regra de cobertura

Cada requisito deve aparecer em pelo menos uma folha de
`roadmap/decomposition.plan.json`. Sobreposição funcional entre folhas não é
permitida: uma folha implementa a responsabilidade e folhas de assurance apenas
validam integrações sistêmicas que não pertencem a um componente isolado.
