# 001 — Presentation Mode

**Roadmap:** v0.2.x  
**Versão-alvo:** v0.2.3  
**Tipo:** Capability lateral de visualização/apresentação  
**Stack base:** Tauri 2 + React 19 + TypeScript + Unified/Remark/Rehype + Shiki + KaTeX + Mermaid  
**Engine de apresentação:** Reveal.js, empacotado localmente  
**Entrada principal:** `F5`  
**Fonte normativa superior:** instrução ESAA / Onda-PRES no event store do projeto (`MD-PRES-*`). O arquivo `ROADMAP-CANONICO-MD-STUDIO-v0.3-v0.5.md` **não existe** neste repositório (roadmap v0.3–v0.5 permanece apenas como especificação futura fora da árvore).  
**Status:** implementado, **em teste**; alvo de liberação **v0.2.3** (não incluído no release v0.2.2)

> Este documento expande a especificação resumida de Presentation Mode. Quando uma decisão já estiver formalmente fechada na instrução ESAA da Onda-PRES, a instrução ESAA prevalece. As decisões abaixo que não existiam na especificação resumida devem ser tratadas como fechamento técnico recomendado para a implementação.

---

## 1. Definição da funcionalidade

Presentation Mode é a capacidade de transformar o documento Markdown atualmente aberto em uma apresentação navegável, em tela cheia, sem criar um segundo arquivo de conteúdo e sem alterar silenciosamente o Markdown original.

O princípio central é:

```text
Markdown atual
      ↓
pipeline de apresentação
      ↓
modelo de slides
      ↓
renderização Reveal.js
      ↓
Presentation Mode
```

O documento `.md` continua sendo a única fonte de verdade.

Presentation Mode não cria um formato proprietário de apresentação, não converte o documento permanentemente e não mantém uma cópia paralela dos slides.

---

## 2. Problema que a funcionalidade resolve

Hoje o usuário pode escrever documentação técnica rica no MD Studio, incluindo:

- headings;
- listas;
- tabelas;
- blocos de código;
- Shiki;
- KaTeX;
- Mermaid;
- imagens locais;
- GitHub Alerts;
- Wiki Links.

Sem Presentation Mode, a reutilização desse conteúdo em aula, reunião, palestra, demonstração técnica ou revisão arquitetural exige copiar o conteúdo para outra ferramenta.

Isso produz dois problemas:

```text
documentação.md
      ↓ copiar
slides.pptx

Agora existem duas fontes de conteúdo.
```

Depois de alterações no Markdown, os slides ficam desatualizados.

Presentation Mode elimina essa bifurcação:

```text
documentação.md
      │
      ├── Editor
      ├── Preview
      └── Presentation Mode
```

Uma fonte, múltiplas formas de visualização.

---

## 3. Valor para o usuário

A funcionalidade deve permitir que uma documentação técnica existente seja apresentada imediatamente, sem workflow externo e sem exigir uma segunda edição do conteúdo.

Casos de uso principais:

```text
Professor
Markdown da aula → F5 → apresentação

Engenheiro
ADR / arquitetura → F5 → reunião técnica

Pesquisador
notas estruturadas → F5 → exposição rápida

Equipe
documentação de projeto → F5 → revisão coletiva
```

O valor não está em competir com PowerPoint ou Keynote em design gráfico. O valor está em permitir que documentação técnica seja apresentada diretamente da fonte original.

---

## 4. Princípios de produto

### 4.1 Markdown continua sendo a fonte de verdade

Presentation Mode nunca mantém estado editorial próprio que possa divergir do arquivo.

O modo deve consumir o conteúdo atual do editor, inclusive alterações ainda não persistidas em disco.

```text
CodeMirror state
      ↓
Presentation Model
```

e não:

```text
arquivo salvo no disco
      ↓
reabrir
      ↓
apresentar
```

Isso evita apresentar uma versão anterior do documento.

### 4.2 Entrar em Presentation Mode não salva o arquivo

Pressionar `F5` não deve:

- forçar `Ctrl+S`;
- disparar `atomic_save`;
- alterar `mtime`;
- gerar evento artificial no WatcherHub;
- mudar o conteúdo do documento.

Presentation Mode é uma operação de leitura sobre o estado atual.

### 4.3 Sair do modo deve restaurar o contexto de autoria

Ao encerrar a apresentação, o usuário deve retornar exatamente ao contexto anterior sempre que tecnicamente possível:

```text
arquivo ativo
modo anterior
cursor
seleção
scroll do editor
scroll do preview
painéis visíveis
foco
```

O objetivo é que Presentation Mode se comporte como uma camada temporária.

### 4.4 Totalmente local

Reveal.js e qualquer tema utilizado devem estar empacotados com o MD Studio.

Proibido:

- carregar Reveal.js por CDN;
- buscar fontes remotas;
- buscar temas remotos;
- carregar imagens externas automaticamente;
- usar analytics;
- enviar conteúdo do documento para rede.

### 4.5 Sem execução de código

Fenced code blocks são apresentados como conteúdo estático.

Nenhum botão Run, shell, JavaScript arbitrário ou executor de código deve ser introduzido.

---

## 5. Posicionamento no roadmap

Presentation Mode pertence à linha `v0.2.x`.

Versão semântica recomendada:

```text
v0.2.2
produto-base

v0.2.3
Presentation Mode

v0.3
Engineering Authoring
```

A capability deve estar concluída antes de ser considerada dependência estável das features posteriores.

Após sua entrega, v0.3 poderá apenas registrá-la na Command Palette:

```text
Ctrl+Shift+P
> Iniciar apresentação
```

Essa integração futura não deve exigir reimplementação do Presentation Mode.

---

## 6. Estado das decisões

### 6.1 Decisões consideradas fechadas

```text
Versão:                v0.2.x / alvo v0.2.3
Engine:                Reveal.js
Entrada principal:     F5
Fonte:                 documento Markdown atual
Local-first:           obrigatório
Rede:                  proibida
IA/LLM:                fora de escopo
Execução de código:    fora de escopo
Parser duplicado:      proibido
Persistência própria:  proibida
```

### 6.2 Decisões de implementação que este documento recomenda fechar

```text
Renderização:          overlay/fullscreen na janela atual
Slide model:           estrutura intermediária derivada da AST
Separação padrão:      baseada em headings
Separação explícita:   marcador dedicado
Horizontal rule:       continua sendo <hr>, não slide break
Mermaid:               reutilizar renderizador existente
KaTeX:                 reutilizar pipeline existente
Shiki:                 reutilizar highlighting existente
Presenter window:      fora da primeira versão
Speaker notes:         fora da primeira versão
Export PPTX:           fora de escopo
```

Se a Onda-PRES já tiver decisão diferente para algum item acima, a Onda-PRES prevalece.

---

## 7. Entrada e saída do modo

### 7.1 Entrada por teclado

Atalho principal:

```text
F5
```

Fluxo:

```text
usuário pressiona F5
      ↓
há documento ativo?
      ├── não → nenhuma apresentação é aberta
      └── sim
            ↓
      capturar estado da autoria
            ↓
      construir PresentationModel
            ↓
      inicializar Reveal.js
            ↓
      entrar em Presentation Mode
```

### 7.2 Entrada por UI

Deve existir uma ação visual equivalente.

Sugestão:

```text
[ ⋮ ]
  └── Apresentar
```

ou, após Command Palette:

```text
Ctrl+Shift+P
> Iniciar apresentação
```

A UI não deve depender exclusivamente de `F5`, especialmente por acessibilidade e descoberta da feature.

### 7.3 Saída

A saída deve ser possível por ação explícita e por teclado.

Comportamento recomendado:

```text
F5 novamente → sair
```

Além de um botão visível/discreto:

```text
Sair da apresentação
```

A tecla `Esc` deve ser tratada com cuidado porque Reveal.js tradicionalmente utiliza `Esc` para overview. A instrução ESAA deve definir se `Esc` permanece reservado ao Reveal ou encerra o Presentation Mode. Não implementar os dois comportamentos de forma ambígua.

### 7.4 Restauração

Ao sair:

```text
destroy Reveal instance
remove listeners
remove presentation DOM
restore layout
restore active document
restore editor state
restore scroll
restore focus
```

Nenhuma reindexação completa deve ocorrer apenas porque o usuário entrou ou saiu da apresentação.

---

## 8. Modelo de estado

Estado sugerido:

```typescript
type PresentationStatus =
  | 'idle'
  | 'preparing'
  | 'presenting'
  | 'closing'
  | 'error';
```

Contexto sugerido:

```typescript
interface PresentationSession {
  status: PresentationStatus;
  documentId: string | null;
  sourceRevision: number;
  currentSlide: number;
  totalSlides: number;
  previousUiState: PreviousUiState | null;
  error: PresentationError | null;
}
```

Estado de UI a preservar:

```typescript
interface PreviousUiState {
  viewMode: 'source' | 'preview' | 'split';
  editorScrollTop: number;
  previewScrollTop: number;
  cursorFrom: number;
  cursorTo: number;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  focusedRegion: string | null;
}
```

Os nomes acima são contratos recomendados, não obrigatórios caso já existam tipos equivalentes.

---

## 9. Fonte de dados

A fonte deve ser o conteúdo em memória do documento atual.

Contrato conceitual:

```typescript
interface PresentationSource {
  documentId: string;
  markdown: string;
  workspaceRoot: string | null;
  relativePath: string | null;
}
```

O `markdown` deve vir do estado atual do CodeMirror/document store.

Presentation Mode não deve reler o arquivo do disco para obter o conteúdo principal.

---

## 10. Modelo intermediário de apresentação

Não acoplar diretamente Reveal.js à string Markdown.

Recomendação:

```text
Markdown
   ↓
Unified / Remark AST
   ↓
Presentation Processor
   ↓
PresentationModel
   ↓
Presentation Renderer
   ↓
Reveal.js
```

Modelo sugerido:

```typescript
interface PresentationModel {
  metadata: PresentationMetadata;
  slides: PresentationSlide[];
  warnings: PresentationWarning[];
}

interface PresentationSlide {
  id: string;
  index: number;
  title: string | null;
  sourceStart: number;
  sourceEnd: number;
  html: string;
}

interface PresentationMetadata {
  title: string | null;
  theme: 'auto' | 'light' | 'dark';
  transition: string;
  slideNumbers: boolean;
}
```

Benefícios do modelo intermediário:

```text
testabilidade
isolamento do Reveal.js
mapeamento source → slide
warnings
cache
futuros exporters
```

---

## 11. Regras de segmentação de slides

Este é um ponto que precisa ser determinístico.

### 11.1 Regra padrão recomendada

Usar headings estruturais como boundaries.

```text
H1 → identidade/título do documento
H2 → novo slide
H3+ → conteúdo interno do slide
```

Exemplo:

```markdown
# Arquitetura do MD Studio

Introdução da apresentação.

## Frontend

React 19 + CodeMirror 6.

## Backend

Tauri 2 + Rust.

### Persistência

Atomic save e WatcherHub.
```

Resultado:

```text
Slide 1
Arquitetura do MD Studio
Introdução da apresentação

Slide 2
Frontend
React 19 + CodeMirror 6

Slide 3
Backend
Tauri 2 + Rust
Persistência
Atomic save e WatcherHub
```

### 11.2 Quebra explícita

Recomendação de marcador dedicado:

```markdown
<!-- md-studio:slide -->
```

Esse marcador força uma quebra sem alterar a semântica visual do documento no preview normal.

Exemplo:

```markdown
## Arquitetura

Primeira parte.

<!-- md-studio:slide -->

Continuação em outro slide.
```

### 11.3 `---` não deve ser usado como slide separator

O MD Studio já utiliza Markdown técnico normal e documentos podem conter thematic breaks.

Portanto:

```markdown
---
```

continua significando:

```html
<hr>
```

e não uma nova slide.

Essa decisão evita que documentos existentes sejam fragmentados acidentalmente.

### 11.4 Sem vertical slides na primeira versão

Reveal.js suporta hierarquias horizontais/verticais, mas isso adiciona uma segunda semântica de navegação.

Para v0.2.3:

```text
sequência linear de slides
```

Vertical slides podem ser avaliados futuramente.

---

## 12. Frontmatter de apresentação

Frontmatter de apresentação deve ser opcional.

Documento sem configuração deve funcionar.

Exemplo recomendado:

```yaml
---
title: Arquitetura do MD Studio
presentation:
  theme: auto
  transition: fade
  slideNumbers: true
  controls: true
  progress: true
---
```

Defaults sugeridos:

```text
theme          auto
transition     fade
slideNumbers   true
controls       true
progress       true
```

Configuração inválida não pode impedir a apresentação.

Deve gerar warning e usar default seguro.

Exemplo:

```text
presentation.theme = "xyz"

warning:
tema desconhecido; usando auto
```

---

## 13. Pipeline de renderização

O Presentation Mode deve reutilizar o máximo possível do pipeline já existente.

Não criar um segundo parser Markdown completo.

Estrutura:

```text
Markdown
   ↓
Remark
   ├── CommonMark
   ├── GFM
   ├── Frontmatter
   ├── Alerts
   ├── Wiki Links
   └── demais plugins existentes
   ↓
Presentation segmentation
   ↓
Rehype
   ├── KaTeX
   ├── Shiki
   ├── sanitização
   └── transformações de apresentação
   ↓
HTML por slide
   ↓
Reveal.js
```

A transformação de apresentação deve ser uma ramificação do pipeline, não uma cópia integral.

---

## 14. Renderização de elementos Markdown

### 14.1 Headings

- H1 do documento fornece título quando disponível.
- H2 normalmente cria slide.
- H3-H6 permanecem dentro do slide.
- IDs devem ser estáveis durante a sessão.

### 14.2 Parágrafos

Renderização normal do pipeline Markdown.

Não alterar automaticamente conteúdo ou resumir texto.

### 14.3 Listas

Suportar:

- unordered;
- ordered;
- nested;
- task list GFM.

Task list deve ser visual, não interativa durante a apresentação.

### 14.4 Tabelas

Renderizar tabelas GFM.

Quando uma tabela exceder largura/altura:

- preservar conteúdo;
- permitir overflow controlado;
- nunca cortar células silenciosamente.

### 14.5 Blockquotes e GitHub Alerts

Reutilizar estilo equivalente ao preview.

Alerts devem preservar diferenciação entre:

```text
NOTE
TIP
IMPORTANT
WARNING
CAUTION
```

### 14.6 Horizontal rule

Permanece `<hr>` dentro do slide.

### 14.7 HTML bruto

Obedecer às regras atuais de sanitização.

Nenhum `<script>`, handler inline ou iframe não autorizado deve sobreviver.

---

## 15. Blocos de código

Presentation Mode deve reutilizar Shiki.

Preservar:

- linguagem;
- highlighting;
- whitespace;
- line wrapping policy;
- botão de cópia somente se fizer sentido na apresentação.

Recomendação para v0.2.3:

```text
highlighting         sim
badge de linguagem   sim
copiar               opcional
formatar             não durante apresentação
executar             nunca
```

Código longo não deve ser truncado silenciosamente.

Se houver overflow vertical, o bloco deve permitir scroll interno ou outro fallback legível definido pela implementação.

---

## 16. KaTeX

Fórmulas inline e em bloco devem utilizar o pipeline KaTeX existente.

Fluxo:

```text
$...$ / $$...$$
      ↓
KaTeX
      ↓
HTML renderizado
      ↓
slide
```

Erro de fórmula:

```text
não abortar apresentação
      ↓
mostrar expressão original
      ↓
registrar warning local
```

---

## 17. Mermaid

Mermaid deve reutilizar o renderizador existente.

Não criar uma segunda implementação do Mermaid apenas para apresentação.

Fluxo:

```text
source Mermaid
      ↓
renderer atual
      ↓
SVG
      ↓
slide
```

### 17.1 Interatividade

Pan/zoom pode ser preservado quando não conflitar com navegação de slides.

Se eventos de teclado/scroll do panzoom interferirem com Reveal.js, priorizar previsibilidade da apresentação.

### 17.2 Erro de Mermaid

Nunca impedir a apresentação completa.

Fallback:

```text
Mermaid inválido
      ↓
bloco de código com source
      +
indicador discreto de erro
```

---

## 18. Imagens locais

Imagens Markdown devem resolver pelo mecanismo local já usado pelo preview.

Regras:

- respeitar workspace/path policy;
- não buscar fallback remoto;
- preservar `alt`;
- `max-width: 100%`;
- não distorcer aspect ratio.

Imagem ausente:

```text
placeholder legível
+
alt/path
```

Não quebrar toda a apresentação.

---

## 19. Wiki Links

Presentation Mode deve renderizar Wiki Links de forma compreensível.

Comportamento recomendado:

```text
[[Arquitetura]]
→ Arquitetura

[[Arquitetura|Visão técnica]]
→ Visão técnica
```

Durante v0.2.3, navegação de Wiki Link dentro da apresentação é opcional.

Se habilitada, não deve abandonar Presentation Mode de forma inesperada.

Abordagem conservadora:

```text
renderizar como texto/link visual
sem navegação de documento durante apresentação
```

---

## 20. Tema visual

### 20.1 Default

`theme: auto`.

Comportamento:

```text
MD Studio dark → presentation dark
MD Studio light → presentation light
```

### 20.2 Tema de apresentação

O tema deve ser próprio para projeção.

Não simplesmente ampliar o CSS do preview.

Necessidades:

- tipografia maior;
- contraste adequado;
- margens de palco;
- código legível em projetor;
- tabelas visíveis;
- headings claramente hierárquicos.

### 20.3 Mudança de tema durante sessão

Não é requisito v0.2.3.

Alterar tema do aplicativo enquanto a apresentação está ativa não precisa reconstruir a sessão em tempo real.

---

## 21. Layout e viewport

Presentation Mode deve ocupar a área disponível e esconder o chrome de autoria.

Durante apresentação, ocultar:

- File Explorer;
- Outline/Inspector;
- toolbar Markdown;
- status bar de autoria;
- breadcrumb;
- controles de edição.

A apresentação precisa dominar a tela.

Overlay recomendado:

```text
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                SLIDE                        │
│                                             │
│                                             │
│                           3 / 18            │
└─────────────────────────────────────────────┘
```

---

## 22. Fullscreen

Presentation Mode e fullscreen são conceitos relacionados, mas não idênticos.

Recomendação:

```text
F5
→ entrar em Presentation Mode
→ solicitar/ativar fullscreen quando suportado
```

Se fullscreen não estiver disponível:

```text
Presentation Mode continua funcional
dentro da janela
```

Isso é importante para:

```text
pnpm dev no navegador
ambientes Wayland/X11 específicos
restrições do WebView
testes automatizados
```

Falha de fullscreen não é falha de Presentation Mode.

---

## 23. Navegação durante apresentação

Navegação mínima:

```text
→ / Space / PageDown   próximo slide
← / PageUp             slide anterior
Home                   primeiro slide
End                    último slide
```

Controles visuais podem existir, mas devem ser discretos.

A apresentação deve funcionar integralmente apenas pelo teclado.

---

## 24. Indicadores de navegação

Configuração padrão recomendada:

```text
slide number   visível
progress bar   visível
controls       discretos
```

Esses elementos devem desaparecer ou reduzir opacidade quando não há interação.

---

## 25. Overview

Reveal.js possui modo overview.

Se preservado:

```text
Esc
→ overview
```

A saída completa de Presentation Mode deve usar outro comando explícito, por exemplo `F5`.

Se a implementação decidir que `Esc` encerra Presentation Mode, o overview deve ser desabilitado.

Não permitir conflito de semântica.

---

## 26. Estado do editor durante apresentação

O documento não deve ficar editável atrás da apresentação.

Mudanças externas no arquivo durante Presentation Mode precisam seguir uma política conservadora.

Recomendação:

```text
Watcher detecta mudança externa
      ↓
não reconstruir slides automaticamente no meio da apresentação
      ↓
registrar estado pendente
      ↓
ao sair, fluxo normal de conflito assume
```

Isso evita que slides mudem durante uma fala.

---

## 27. Mudanças não salvas

Presentation Mode deve apresentar o buffer atual.

Exemplo:

```text
arquivo salvo:
# Versão A

editor atual:
# Versão B

F5
→ apresenta Versão B
```

Ao sair:

```text
editor continua com Versão B não salva
```

Nenhum save implícito.

---

## 28. Atualização durante a apresentação

v0.2.3 não precisa hot-reload da apresentação a cada edição porque o editor não está ativo.

A sessão usa um snapshot lógico do buffer no momento da entrada.

Fluxo:

```text
F5
snapshot revision 42
      ↓
Presentation Session revision 42
```

Ao sair e editar:

```text
revision 43
```

Novo F5 reconstrói slides.

---

## 29. Cache

O PresentationModel pode ser cacheado pelo hash/revision do documento.

Exemplo:

```text
documentId + sourceRevision + presentationConfig
```

Se nada mudou:

```text
reutilizar model
```

Se Markdown/config mudou:

```text
invalidar
reconstruir
```

Cache não deve persistir como uma segunda fonte documental.

---

## 30. Carregamento do Reveal.js

Reveal.js deve ser lazy-loaded.

Objetivo:

- não aumentar custo de inicialização da aplicação;
- não criar listeners enquanto feature não está ativa;
- evitar impacto na edição normal.

Fluxo:

```text
MD Studio inicia
Reveal não inicializado

F5
↓
import lazy
↓
create deck
```

Ao sair:

```text
deck.destroy()
listeners removidos
DOM liberado
```

---

## 31. Separação de componentes

Estrutura conceitual sugerida:

```text
src/presentation/
├── PresentationMode.tsx
├── PresentationStage.tsx
├── presentation-model.ts
├── presentation-processor.ts
├── presentation-config.ts
├── presentation-session.ts
├── presentation-theme.ts
└── presentation.css
```

Testes:

```text
src/presentation/__tests__/
```

A estrutura real deve respeitar a organização existente do repositório.

---

## 32. Contratos sugeridos

### 32.1 Config

```typescript
interface PresentationConfig {
  theme: 'auto' | 'light' | 'dark';
  transition: 'none' | 'fade' | 'slide';
  slideNumbers: boolean;
  controls: boolean;
  progress: boolean;
}
```

### 32.2 Warning

```typescript
interface PresentationWarning {
  code: string;
  slideIndex: number | null;
  message: string;
}
```

### 32.3 Error

```typescript
interface PresentationError {
  code: string;
  message: string;
  recoverable: boolean;
}
```

---

## 33. Capability contract

ID recomendado:

```text
presentation.mode
```

Futuro command registry:

```typescript
interface AppCapability {
  id: string;
  available: boolean;
  execute(): Promise<void>;
}
```

Command Palette v0.3:

```text
presentation.mode
      ↓
"Iniciar apresentação"
```

A Command Palette deve apenas acionar a capability.

Não deve conter lógica Reveal.js.

---

## 34. IPC e backend

Presentation Mode deve permanecer predominantemente frontend.

Não criar IPC apenas para transformar Markdown em slides.

Backend/Tauri só deve participar quando necessário para uma capability nativa já existente, como:

- fullscreen da janela;
- resolução controlada de recurso local quando aplicável.

Não adicionar novo armazenamento Rust para Presentation Mode.

---

## 35. Segurança

Regras obrigatórias:

```text
sem rede
sem CDN
sem iframe remoto
sem scripts provenientes do Markdown
sem eval de conteúdo
sem execução de fenced code
sem telemetria
```

O HTML dos slides deve continuar passando pela política de sanitização do MD Studio.

Conteúdo Markdown não ganha privilégios adicionais por estar em Presentation Mode.

---

## 36. Privacidade

Nenhum evento da apresentação é enviado externamente.

Não registrar:

- slides visualizados;
- tempo em cada slide;
- documentos apresentados;
- quantidade de apresentações;
- conteúdo exibido.

Logs locais de erro só devem seguir a política geral do produto.

---

## 37. Acessibilidade

Presentation Mode deve suportar:

- navegação integral por teclado;
- contraste adequado;
- foco visível nos controles;
- `aria-label` nos botões;
- respeito a `prefers-reduced-motion`;
- opção de transição `none`.

Conteúdo textual deve permanecer selecionável quando isso não prejudicar a navegação.

---

## 38. Reduced motion

Quando o sistema operacional solicitar redução de movimento:

```text
transition → none
```

ou equivalente conservador.

Não forçar animações de slide.

---

## 39. Conteúdo excessivo em um slide

Presentation Mode não deve tentar reescrever ou resumir o conteúdo.

Política recomendada:

```text
conteúdo cabe
→ render normal

conteúdo excede
→ overflow controlado
→ warning de autoria
```

Não:

```text
reduzir fonte indefinidamente
cortar conteúdo
resumir automaticamente
```

Uma futura feature de MD Doctor pode apontar:

```text
Slide potencialmente longo
```

mas isso não pertence à primeira implementação.

---

## 40. Documento sem headings

Deve continuar apresentável.

Fallback:

```text
documento inteiro
→ um slide
```

Se houver marcadores explícitos `<!-- md-studio:slide -->`, eles dividem o conteúdo mesmo sem headings.

---

## 41. Documento vazio

F5 em documento vazio:

- não deve causar crash;
- mostrar um estado vazio simples ou não abrir apresentação;
- decisão visual deve ser consistente.

Mensagem sugerida:

```text
Este documento não possui conteúdo para apresentação.
```

---

## 42. Frontmatter inválido

Presentation Mode não pode corrigir frontmatter.

Comportamento:

```text
frontmatter inválido
      ↓
usar configuração padrão
      ↓
warning local
```

O Markdown permanece intocado.

---

## 43. Links externos

Links HTTP/HTTPS no conteúdo podem ser exibidos como links visuais.

Presentation Mode não deve fazer prefetch.

Abertura de URL deve obedecer às políticas gerais do MD Studio/Tauri.

Não adicionar acesso automático à rede apenas porque um link existe.

---

## 44. Links locais

Links para documentos/arquivos devem utilizar o resolver existente quando necessário.

A apresentação não deve introduzir uma segunda política de resolução de paths.

---

## 45. Assets ausentes

Fallback visual deve ser explícito.

Exemplo:

```text
[Imagem não encontrada]
assets/arquitetura.png
```

Não deixar apenas um ícone quebrado do navegador sem contexto.

---

## 46. Estado de erro global

Erro fatal só deve ocorrer quando o PresentationModel não puder ser construído.

Mesmo assim:

```text
editor permanece intacto
UI anterior é restaurada
erro é exibido
```

Mensagem deve dizer o que falhou sem expor stack trace bruto ao usuário.

---

## 47. Fallback por componente

```text
KaTeX inválido
→ source matemático

Mermaid inválido
→ source como code block

imagem ausente
→ placeholder

linguagem Shiki desconhecida
→ code block sem highlighting especial

config inválida
→ defaults
```

Um componente inválido não derruba toda a sessão.

---

## 48. Observabilidade local

Logs úteis para desenvolvimento podem registrar:

```text
tempo de build
número de slides
warnings
erro de renderer
```

Sem incluir conteúdo textual sensível quando não necessário.

Nenhum log remoto.

---

## 49. Performance

Presentation Mode não deve degradar a experiência de edição quando inativo.

Requisitos:

- Reveal.js lazy-loaded;
- nenhum listener global permanente desnecessário;
- nenhum reindex ao alternar modo;
- cache por revision/hash quando útil;
- Mermaid/Shiki reaproveitados quando possível;
- destruir recursos ao sair.

Budget definitivo deve respeitar os NFRs canônicos do projeto.

---

## 50. Documentos grandes

Testar explicitamente:

```text
50 slides
100 slides
documento 250 KiB
múltiplos code blocks
múltiplos Mermaid
múltiplas fórmulas
imagens locais
```

O objetivo é evitar:

- freeze perceptível;
- crescimento de memória sem liberação;
- listeners duplicados após múltiplas sessões.

---

## 51. Ciclo repetido

Cenário obrigatório:

```text
F5
apresentar
sair
F5
apresentar
sair
... repetir
```

Não pode ocorrer:

- duplicação de eventos;
- deck sobre deck;
- aumento progressivo de memória;
- teclas processadas duas vezes;
- perda de foco no editor.

---

## 52. Integração com autosave

Presentation Mode não altera a política existente de autosave.

Se houver timer pendente ao pressionar F5, a implementação deve seguir a política já definida pelo aplicativo; não criar um segundo comportamento específico sem decisão explícita.

Presentation Mode não deve implementar persistência.

---

## 53. Integração com WatcherHub

Entrar ou sair do modo não gera escrita, portanto não deve criar novos eventos de disco.

Alterações externas detectadas durante a apresentação devem ser tratadas somente pelo fluxo normal de concorrência quando o usuário retornar à autoria.

---

## 54. Integração com Outline

Presentation Mode não depende do painel Outline.

No futuro, o outline pode oferecer:

```text
Apresentar a partir daqui
```

mas isso não pertence à v0.2.3.

---

## 55. Integração com Command Palette

Quando v0.3 entregar a Command Palette, adicionar:

```text
Iniciar apresentação
Encerrar apresentação
```

A integração deve apenas chamar a capability `presentation.mode`.

Não modificar o renderer.

---

## 56. Integração com Publishing Engine

Presentation Mode não é exporter.

Distinção:

```text
Presentation Mode
Markdown → visualização temporária interativa

Publishing Engine
Markdown → arquivo distribuível
```

No futuro pode haver exportação de slides, mas não pertence a esta capability.

---

## 57. Não é PowerPoint

Presentation Mode não tenta fornecer:

- editor visual de slides;
- caixas posicionáveis livremente;
- animações arbitrárias;
- timeline;
- masters;
- objetos arrastáveis;
- design por canvas.

O produto continua sendo Markdown-first.

---

## 58. Não é um novo modo de autoria

Não deve surgir algo como:

```text
Presentation Editor
```

com estado independente.

O usuário edita Markdown normal e apresenta o mesmo conteúdo.

---

## 59. UX de transição

Entrada:

```text
F5
↓
estado preparing curto
↓
presentation
```

Evitar flash branco entre o tema do aplicativo e o primeiro slide.

Saída:

```text
F5 / comando sair
↓
closing
↓
restaurar UI
↓
foco volta ao editor/preview anterior
```

---

## 60. Indicador de preparação

Se o documento exigir tempo perceptível para Mermaid/Shiki, mostrar estado discreto:

```text
Preparando apresentação…
```

Não bloquear com modal.

---

## 61. Controles de apresentação

Controles mínimos recomendados:

```text
Anterior
Próximo
Número do slide
Sair
```

Podem ficar ocultos enquanto o ponteiro não se move.

---

## 62. Cursor e mouse

Durante apresentação:

- esconder cursor após período de inatividade quando possível;
- reaparecer ao mover;
- controles reaparecem junto.

Esse comportamento é polish, não requisito bloqueante da primeira task.

---

## 63. Tela do apresentador

Fora da primeira versão.

Não implementar em v0.2.3:

```text
segunda janela
notas do apresentador
timer
próximo slide
dual-monitor
```

Pode existir futuramente como capability adicional.

---

## 64. Speaker notes

Fora da v0.2.3.

Não criar sintaxe de notes nesta etapa.

Isso evita introduzir convenção Markdown antes de necessidade real.

---

## 65. Fragmentos progressivos

Fora do escopo inicial, a menos que a Onda-PRES já tenha especificado.

Não interpretar listas automaticamente como animações fragmentadas.

O conteúdo deve aparecer de forma determinística.

---

## 66. Exportação da apresentação

Fora de escopo:

```text
PPTX
PDF de slides
Reveal static site
vídeo
```

Esses formatos pertencem a decisões futuras do Publishing Engine.

---

## 67. Temas customizados pelo usuário

Fora da primeira versão.

v0.2.3 deve fornecer temas internos estáveis.

Custom CSS de apresentação pode ser avaliado futuramente, pois amplia superfície de segurança e suporte.

---

## 68. Atalhos propostos

Mapa mínimo:

```text
F5          entrar/sair da apresentação
Right       próximo slide
Left        anterior
Space       próximo
PageDown    próximo
PageUp      anterior
Home        primeiro
End         último
```

Conflitos com Reveal.js devem ser resolvidos de forma centralizada, não adicionando handlers concorrentes.

---

## 69. Testes unitários — segmentação

Casos obrigatórios:

```text
H1 + H2
múltiplos H2
H3 dentro de H2
sem headings
documento vazio
marcador explícito de slide
múltiplos marcadores
horizontal rule ---
frontmatter
```

Validar principalmente que `---` de Markdown não cria slide indevido.

---

## 70. Testes unitários — modelo

Validar:

- índices;
- IDs;
- sourceStart/sourceEnd;
- títulos;
- warnings;
- defaults;
- config inválida;
- ordem determinística.

---

## 71. Testes de renderização

Cobertura:

- parágrafos;
- listas;
- tasks;
- tabelas;
- links;
- imagens;
- Alerts;
- Shiki;
- KaTeX;
- Mermaid;
- blockquote;
- horizontal rule.

---

## 72. Testes de fallback

Obrigatórios:

```text
Mermaid inválido
KaTeX inválido
imagem ausente
linguagem Shiki desconhecida
frontmatter inválido
config de tema inválida
```

A apresentação deve continuar.

---

## 73. Testes de estado

Validar:

```text
modo source → F5 → sair → source
modo preview → F5 → sair → preview
modo split → F5 → sair → split
```

Preservar:

- cursor;
- seleção;
- scroll;
- sidebars;
- arquivo ativo.

---

## 74. Testes de conteúdo não salvo

Cenário obrigatório:

1. abrir documento;
2. editar sem salvar;
3. F5;
4. verificar que apresentação usa edição atual;
5. sair;
6. verificar que documento continua dirty;
7. confirmar que nenhum save foi disparado.

---

## 75. Testes de regressão

Presentation Mode não pode quebrar:

- CodeMirror;
- Preview;
- Split;
- scroll sync;
- autosave;
- atomic save;
- WatcherHub;
- ConflictDialog;
- Wiki Links;
- Backlinks;
- Shiki;
- KaTeX;
- Mermaid;
- HTML Export;
- File Explorer;
- Settings.

---

## 76. Testes de lifecycle

Executar ciclos repetidos.

Exemplo:

```text
20x:
  entrar
  navegar
  sair
```

Verificar:

- handlers;
- memória;
- DOM;
- foco;
- console errors.

---

## 77. Testes de teclado

Garantir operação sem mouse.

Também testar:

- foco em links;
- controles;
- reduced motion;
- atalhos não vazando para o editor sob o overlay.

---

## 78. Testes de fullscreen

Testar:

- Tauri Linux;
- Tauri Windows;
- navegador de desenvolvimento;
- fallback quando fullscreen é negado/indisponível.

Presentation Mode deve permanecer utilizável sem fullscreen nativo.

---

## 79. Testes de tema

```text
app dark → presentation dark
app light → presentation light
theme auto
```

Verificar contraste de:

- texto;
- código;
- tables;
- Alerts;
- links;
- Mermaid;
- fórmulas.

---

## 80. Testes de performance

Medir:

- tempo de construção do PresentationModel;
- tempo até primeiro slide;
- custo de Mermaid;
- custo de Shiki;
- memória antes/depois de destruir deck.

Os valores de aprovação devem usar budgets NFR do projeto.

---

## 81. Testes manuais

Roteiro mínimo:

```text
1. Abrir documentação real extensa.
2. Alterar uma frase sem salvar.
3. Pressionar F5.
4. Confirmar frase nova no slide.
5. Navegar por toda a apresentação.
6. Testar Mermaid.
7. Testar fórmula.
8. Testar tabela.
9. Testar imagem local.
10. Sair.
11. Confirmar cursor e contexto anteriores.
12. Confirmar arquivo ainda dirty.
13. Salvar manualmente.
14. Repetir apresentação.
```

---

## 82. Critérios de aceitação funcionais

A capability estará funcionalmente aceita quando:

```text
[x] F5 inicia Presentation Mode com documento ativo
[x] documento em memória é a fonte
[x] entrar no modo não altera Markdown
[x] entrar no modo não força save
[x] slides são derivados deterministicamente
[x] Reveal.js é carregado localmente
[x] navegação por teclado funciona
[x] Shiki funciona
[x] KaTeX funciona
[x] Mermaid funciona ou degrada com fallback
[x] imagens locais funcionam ou mostram placeholder
[x] sair restaura o contexto anterior
[x] múltiplas sessões não duplicam listeners
[x] nenhum acesso remoto é necessário
```

---

## 83. Critérios de aceitação arquiteturais

```text
[x] parser Markdown não foi duplicado
[x] pipeline existente foi reutilizado
[x] PresentationModel é derivado e descartável
[x] nenhuma nova fonte de verdade foi criada
[x] sem armazenamento paralelo dos slides
[x] sem IPC desnecessário
[x] sem dependência cloud
[x] sem execução de código
[x] capability isolada da futura Command Palette
```

---

## 84. Critérios de aceitação de segurança

```text
[x] rehype-sanitize/política equivalente preservada
[x] script do Markdown não executa
[x] handlers inline não executam
[x] Reveal.js não usa CDN
[x] assets externos não são buscados automaticamente
[x] paths locais seguem política existente
[x] nenhum conteúdo é enviado por rede
[x] nenhuma telemetria é criada
```

---

## 85. Critérios de aceitação de UX

```text
[x] entrada previsível
[x] saída previsível
[x] sem flash branco relevante
[x] apresentação domina viewport
[x] controles não poluem o slide
[x] tema claro/escuro coerente
[x] slide number/progress legíveis
[x] conteúdo nunca desaparece silenciosamente
```

---

## 86. Non-goals formais

Não implementar nesta capability:

```text
editor visual de slides
PowerPoint
PPTX export
PDF de slides
speaker notes
presenter window
dual-monitor
IA
LLM
execução de código
slides verticais
colaboração online
telemetria
sincronização cloud
temas remotos
CDN
hot reload enquanto apresenta
```

---

## 87. Decomposição ESAA recomendada

A instrução Onda-PRES existente continua normativa. Caso seja necessário decompor ou reconciliar tasks, a divisão recomendada é:

```text
MD-PRES-001
PresentationModel e segmentação

MD-PRES-002
Presentation processor reutilizando Unified

MD-PRES-003
Reveal.js renderer e lifecycle

MD-PRES-004
Integração Shiki / KaTeX / Mermaid / assets

MD-PRES-005
F5, navegação, fullscreen e restauração de UI

MD-PRES-006
Fallbacks, acessibilidade e reduced motion

MD-PRES-007
QA, regressão, performance e encerramento
```

---

## 88. Dependências entre tarefas sugeridas

```text
MD-PRES-001
      ↓
MD-PRES-002
      ↓
      ├─────────────┐
      ↓             ↓
MD-PRES-003     MD-PRES-004
      │             │
      └──────┬──────┘
             ↓
        MD-PRES-005
             ↓
        MD-PRES-006
             ↓
        MD-PRES-007
```

---

## 89. Verify sugerido

Caso ainda não existam verificadores definidos na Onda-PRES:

```text
md_pres_001_model_pass
md_pres_002_processor_pass
md_pres_003_reveal_pass
md_pres_004_rich_content_pass
md_pres_005_lifecycle_pass
md_pres_006_accessibility_pass
md_pres_007_qa_pass
```

Gate final sugerido:

```text
presentation_mode_complete
```

Se a instrução ESAA já definir outros identificadores, preservar os existentes.

---

## 90. Regressões obrigatórias antes do gate final

```text
Editor Source                 ok
Preview                       ok
Split                         ok
Auto-save                     ok
Ctrl+S                        ok
WatcherHub                    ok
ConflictDialog                ok
Wiki Links                    ok
Backlinks                     ok
Outline                       ok
Shiki                         ok
KaTeX                         ok
Mermaid                       ok
HTML Export                   ok
File Explorer                 ok
Settings                      ok
```

---

## 91. Documentação do usuário

Após entrega, atualizar o guia com:

```text
Como iniciar apresentação
Como navegar
Como sair
Como o Markdown vira slides
Como forçar quebra de slide
Como configurar tema
Limitações conhecidas
```

Não documentar opções que não tenham sido implementadas.

---

## 92. Documentação técnica

Registrar:

- PresentationModel;
- regra de segmentação;
- integração Reveal.js;
- lifecycle;
- source revision;
- fallbacks;
- security model;
- atalhos;
- testes;
- limitations.

---

## 93. Resultado esperado

Antes:

```text
Markdown técnico
      ↓
para apresentar
      ↓
copiar para outra ferramenta
      ↓
duas fontes divergentes
```

Depois:

```text
Markdown técnico
      ├── editar
      ├── visualizar
      └── F5 → apresentar
```

O usuário mantém um único documento, e Presentation Mode passa a ser apenas outra projeção desse mesmo conteúdo.

---

## 94. Definição final da capability

Presentation Mode deve ser entendido no MD Studio como:

> Uma projeção temporária, local e não destrutiva do documento Markdown atual em uma sequência de slides Reveal.js, reutilizando o pipeline de renderização existente e preservando Markdown como única fonte de verdade.

Essa definição deve orientar qualquer decisão de implementação que não esteja explicitamente coberta neste documento ou na instrução ESAA da Onda-PRES.
