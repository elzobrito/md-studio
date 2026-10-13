# MD Studio 0.5.3

## Atualizações

- Backlinks reconhecem links Markdown comuns entre arquivos .md, além de wikilinks.
- Ao abrir o workspace, o índice é reconciliado com o disco e a interface recebe o evento index:reconciled para atualizar os metadados.
- Reconciliação segura: leitura incompleta conserva o índice anterior; scans e atualizações incrementais são serializados para evitar aplicar snapshots obsoletos.
- Graph Explorer usa Three.js/WebGL 2D, recursos locais sem CDN e interpolação das posições, preservando d3-force, filtros e controles.
- Dependência transitiva source-map-js atualizada para 1.2.2, corrigindo GHSA-68fv-2mgg-jv7q.

## Pacotes e validação

Os pacotes Linux (.deb, AppImage, .rpm) e Windows (.exe, .msi) devem ser gerados pelos workflows a partir da tag v0.5.3; consultar assets e checksums do release para a entrega final. Esta nota preparada não comprova publicação.

## Limitações conhecidas

- A auditoria pnpm ainda informa quatro avisos low em DOMPurify/KaTeX; nenhum ignore adicional foi introduzido.
- A reconciliação mantém o lock durante a leitura do workspace: consultas de metadados podem esperar o scan terminar em workspaces grandes.
- O grafo de rastreabilidade não cataloga integralmente o Graph Explorer e os novos métodos; os warnings estão registrados nos artefatos ESAA.
- No Ubuntu, o launcher mantém GDK_BACKEND=x11 e WEBKIT_DISABLE_DMABUF_RENDERER=1. A validação visual deve conferir o executável efetivamente iniciado.
