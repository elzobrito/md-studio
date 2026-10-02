# Verificação funcional e visual — MD-UX-DOCBAR-DEDUP-001

Data: 2026-09-29
Ambiente: aplicação Vite em `http://localhost:1420/`, janela Edge, viewport 1854×943 px.
Documento: conteúdo temporário no navegador, 60 seções, 239 linhas e 3.180 palavras; não foi salvo em arquivo.

## Resultados por modo

| Modo | Controles globais no AppHeader | Cópias na DocumentBar | Controles preservados | Geometria |
|---|---:|---:|---|---|
| Markdown/source | alternância, apresentação, salvar e exportar: 1 conjunto | 0 | aba do documento | editor `scrollHeight=5435`, `clientHeight=779`; página `scrollHeight=943`, `scrollY=0` |
| Formatado/preview | alternância, apresentação, salvar e exportar: 1 conjunto | 0 | aba do documento e sub-barra do preview | header y=0/h=40; DocumentBar y=65/h=36; centro y=65/h=852; preview y=101/h=816; footer y=917/h=26; página sem rolagem externa |
| Dividida/split | alternância, apresentação, salvar e exportar: 1 conjunto | 0 | aba, orientação dividida e sub-barra do preview | header e footer mantêm a mesma geometria; editor `scrollHeight=7924`, `clientHeight=780`; preview fica limitado à área central de 816 px |

A inspeção do DOM confirmou, nos três modos, um único conjunto das ações globais no AppHeader, nenhuma cópia delas na DocumentBar, a barra de preview no modo correspondente e o controle de orientação no modo dividido. A captura visual da janela mostrou o modo dividido com editor e preview lado a lado, header e footer fixos, e apenas uma barra de ações globais. A captura foi observada na sessão CUA; não foi persistida como arquivo de imagem.

## Método e limitações

A inspeção foi feita na aplicação renderizada com conteúdo longo, alternando source, preview e split. A CLI `agent-browser` não estava instalada; a validação visual e DOM foi executada pela automação CUA no navegador desktop. A sessão continha um documento temporário não salvo; ela não faz parte dos arquivos alterados.
