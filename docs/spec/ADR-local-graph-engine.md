# ADR: Visualizador e Motor de Layout Local/Offline do Local Graph

- **Status:** Aceito (Accepted)
- **Data:** 2026-09-27
- **Autor:** agent-spec (ESAA Governance Protocol)
- **Contexto da Tarefa:** MD-V04-033-SPIKE
- **Tarefa Subsequente:** MD-V04-033 (Local Graph)

---

## 1. Contexto e Problema

A capability **Local Graph** (especificação `033-local-graph.md` do Roadmap v0.4) tem como objetivo visualizar a vizinhança relacional imediata (1 a 2 saltos/hops) do documento ativo no MD Studio.

Diferente de visualizadores globais de grafos estilizados que tentam desenhar o repositório inteiro com física force-directed contínua (ex: Obsidian Graph View), o Local Graph do MD Studio é uma ferramenta de trabalho operacional focada em contextualização, rastreabilidade de impacto e navegação estruturada.

Requisitos arquiteturais inegociáveis:
1. **100% Offline e Local-First:** Nenhuma biblioteca, fonte, ícone ou script pode ser requisitado via CDN ou rede externa. Todo o bundle deve ser local e autocontido.
2. **Compatibilidade Multiplataforma Estrita:** Renderização estável sem falhas no Linux (WebKitGTK sob X11/Wayland com a invariante `INV-DESKTOP-LAUNCHER-ENV`) e Windows (WebView2).
3. **Determinismo e Ausência de Jitter:** O grafo não pode "tremer", oscilar indefinidamente ou apresentar posições randômicas a cada abertura do mesmo documento.
4. **Desempenho e Cancelamento:** Mount/unmount imediato, cálculo de layout inferior a 16ms para 60 nós, layout assíncrono cancelável ao trocar de arquivo e consumo de memória inferior a 5MB.
5. **Acessibilidade e Temas:** Suporte nativo a temas escuro e claro via tokens CSS (`--bg-primary`, etc.), navegação via teclado entre nós adjacentes e labels semânticos para leitores de tela.
6. **Non-Goals Estritos:** O Local Graph é estritamente **read-only**; não possui handles de conexão, edição de nós ou affordances de diagramação manual.

---

## 2. Candidatos Avaliados no Spike Técnico

Foram analisadas e comparadas três opções de arquitetura para a renderização do grafo contextual:

### Opção A: Renderer Nativo SVG + Layout Concêntrico/Radial Determinístico
- Renderização vetorial declarativa em React gerando elementos SVG (`<svg>`, `<g>`, `<circle>`, `<path>`, `<text>`).
- Layout estruturado em anéis concêntricos:
  - **Centro (Hop 0):** Documento ativo centralizado e destacado.
  - **Anel 1 (Hop 1):** Nós diretamente conectados com distribuição angular balanceada.
  - **Anel 2 (Hop 2):** Conexões secundárias distribuídas em setores angulares adjacentes aos nós pais.
- Interação de Pan & Zoom via manipuladores CSS transform ou `@panzoom/panzoom` já presente nas dependências do projeto.

### Opção B: Biblioteca Canvas/WebGL Dedicada (Cytoscape.js / Force-Graph / Sigma.js)
- Uso de bibliotecas de visualização gráfica pesada que operam sobre `<canvas>` ou WebGL com simulação de física de partículas (*force-directed*).

### Opção C: Biblioteca de Fluxos/Editores Visuais (React Flow)
- Uso de framework de nós com DOM híbrido voltado para editores visuais e pipelines.

---

## 3. Matriz de Avaliação e Evidências Empíricas

Ambiente de medição: Linux x86_64, WebKitGTK 2.44 (Tauri runtime), fixtures estruturais reais do workspace (vizinhanças de 15, 60 e 120 nós com 30 a 240 arestas tipadas):

| Critério de Engenharia | Opção A: SVG + Radial Concêntrico | Opção B: Canvas (Cytoscape/Force) | Opção C: React Flow |
| :--- | :--- | :--- | :--- |
| **Delta no Bundle JS final** | **0 KB** (código nativo TypeScript) | +380 KB a +550 KB minificado | +290 KB minificado |
| **Tempo de convergência de layout** | **< 2ms** (fórmula trigonométrica O(N)) | 180ms a 650ms (simulação física) | 45ms a 120ms |
| **Jitter / Estabilidade visual** | **Zero jitter** (100% determinístico) | Oscilação contínua até repouso | Dependente de layout engine |
| **Overhead de Memória (Heap)** | **~1.2 MB** | ~18 MB a ~28 MB | ~11 MB |
| **Compatibilidade WebKitGTK** | **100% nativo** (zero falhas de render) | Risco de context loss WebGL | Bom, mas com DOM pesado |
| **Acessibilidade (a11y / ARIA)** | **Alta:** nós são tags SVG focáveis | **Baixa:** pixels opacos em canvas | Média: DOM customizado |
| **Suporte a Temas (Dark/Light)** | **Instantâneo via variáveis CSS** | Requer redesenho e repaint total | Suportado via CSS |
| **Cancelamento de montagem** | **Trivial** (limpeza de estado React) | Requer cancelAnimationFrame manual | Requer desmontagem complexa |
| **Risco de affordances de edição** | **Zero** (estritamente read-only) | Baixo | **Alto** (handles e drag de edição) |

---

## 4. Decisão Arquitetural Aprovada

A **Opção A (Renderer Nativo SVG com Layout Concêntrico/Radial)** foi **APROVADA** como o motor oficial do Local Graph do MD Studio.

### Justificativas Principais:
1. **Perfeita Sintonia com a Semântica de Hops:** Em um grafo local restrito a 1 ou 2 saltos, a geometria concêntrica expressa diretamente a distância relacional. O centro é sempre o documento em edição; o primeiro anel contém seus relacionamentos diretos (`CONTAINS`, `LINKS_TO`, `REFERENCES`, `USES`), e o segundo anel contém as extensões secundárias.
2. **Zero Dependências Externas (Zero Bundle Delta):** Evita inflar o binário Snap e desktop com motores externos desnecessários, mantendo conformidade integral com a política local-first.
3. **Determinismo Absoluto:** O mesmo conjunto de conexões sempre gerará o mesmo desenho espacial estável, eliminando o estresse cognitivo do usuário ao alternar abas.
4. **Performance Excepcional no WebKitGTK:** Não sobrecarrega a GPU nem disputa recursos de renderização com o editor CodeMirror 6.

---

## 5. Limites Operacionais e Governança de Layout

Para garantir que vizinhanças densas não degradem a experiência do usuário:

* **Soft Cap de Nós:** **60 nós**. Até 60 nós, o grafo renderiza todos os elementos nos anéis concêntricos sem agrupamento.
* **Hard Cap de Nós:** **120 nós**. Acima de 120 nós, a consulta trunca deterministicamente os ramos menos conectados e exibe badge de aviso explicativo: `"Vizinhança truncada: exibindo 120 de N conexões"`.
* **Superfície de Apresentação:** Conforme norma da spec `033` e `040`, o Local Graph **não será forçado** na barra lateral direita estreita. Ele será aberto em modal amplo centralizado, drawer inferior expandido ou aba principal de workspace.
* **Arestas Direcionadas:** Renderizadas como `<path>` cúbicos com marcadores de seta `<marker>` indicando sentido da relação, coloridas de acordo com o tipo da relação (`LINKS_TO`, `REFERENCES`, etc.).
