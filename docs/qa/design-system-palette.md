# QA progressivo — paleta Catppuccin

## Contexto

- Tarefas ESAA: MD-DS-001 e MD-DS-002.
- Checkout observado: `main`, HEAD `3fceeec` (24/09/2026); havia alterações locais anteriores em temas e apresentação.
- Referência da solicitação: Catppuccin Latte para claro e Catppuccin Mocha para escuro.
- Este relatório registra a auditoria inicial das duas paletas. A inspeção visual integrada, os cálculos de contraste e a regressão completa permanecem para MD-DS-004/005/007.

## Modo claro — MD-DS-001

O bloco original em `src/styles/themes/light.css` usava cores próprias (#ffffff, #f4f6f8, #0f172a, #2563eb e #24292e) e não possuía os tokens semânticos de slide. O bloco foi substituído pela paleta Latte da tarefa. Os nomes de compatibilidade antigos (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`, `--text-tertiary`, `--border-focus`, `--color-accent-hover`, `--panel-bg`, `--bg`, `--bg-elevated`, `--fg`, `--fg-muted`, `--panel`, `--accent`, `--accent-hover`, `--accent-soft` e `--danger`) foram mantidos como aliases para os novos tokens. `--shadow-sm` e `--shadow-md` também foram preservados.

## Modo escuro — MD-DS-002

| Token | Antes | Ação / valor atual | Motivo |
|---|---|---|---|
| `--bg-base` / `--slide-bg` | `#1e1e2e` (base visual) | Mantido `#1e1e2e` | Já correspondia ao Mocha |
| `--bg-surface` / `--bg-mantle` | `#181825` (painéis/código) | Mantido `#181825` | Já correspondia ao Mocha |
| `--bg-overlay` | `#313244` (hover/superfície) | Adicionado `#313244` | Formaliza o token semântico |
| `--bg-crust` | `#11111b` (terciário) | Formalizado `#11111b` | Já usado como superfície profunda |
| `--text-primary` / `--code-color` / `--slide-text` | `#cdd6f4` | Mantido `#cdd6f4` | Já correspondia ao Mocha |
| `--text-secondary` | `#a6adc8` | Mantido `#a6adc8` | Já correspondia ao Mocha |
| `--text-muted` | `#6c7086` | Ajustado para `#7f849c` | Valor Mocha de overlay0 solicitado |
| `--text-disabled` | Ausente | Adicionado `#585b70` | Token Mocha de surface2 |
| `--text-inverse` | Ausente | Adicionado `#1e1e2e` | Texto sobre acento/superfície clara |
| `--color-accent` / `--color-info` / `--slide-heading` | `#89b4fa` | Mantido `#89b4fa` | Já correspondia ao Blue do Mocha |
| `--color-accent-2` | Ausente | Adicionado `#cba6f7` | Mauve Mocha |
| `--color-accent-3` | Ausente | Adicionado `#89dceb` | Sky Mocha |
| `--color-success`, `--color-warning`, `--color-error` | `#a6e3a1`, `#f9e2af`, `#f38ba8` | Mantidos | Já correspondem ao Mocha |
| `--border` / `--slide-border` | `#313244` | Mantido `#313244` | Já correspondia ao Mocha |
| `--border-strong` | Ausente | Adicionado `#45475a` | Surface1 Mocha |
| `--color-hover` / `--color-selection` / `--color-focus` | Parcialmente ausentes | `#313244`, `#45475a`, `#89b4fa` | Formaliza estados de interação |
| `--code-bg` | `#1e1e2e` | Ajustado para `#181825` | Mantle para blocos; preserva contraste com texto |
| `--inline-code-bg` / `--inline-code-border` | `#313244`, `#45475a` | Mantidos | Já correspondem à superfície Mocha |
| `--inline-code-color` | `#cdd6f4` | Ajustado para `#f38ba8` | Red inline-code da paleta e distinção semântica |
| `--code-badge-color` | `#cdd6f4` | Ajustado para `#a6adc8` | Texto secundário Mocha para controles |
| `--code-badge-bg` / `--code-badge-hover` | `#45475a`, `#585b70` | Mantidos | Já correspondiam a surface1/surface2 |
| `--slide-preformatted` | Ausente | Adicionado `#cdd6f4` | Texto Mocha explícito em blocos sem linguagem |
| `--slide-surface` | Ausente | Adicionado `#313244` | Superfície de destaque Mocha |

Os aliases de compatibilidade foram mantidos e remapeados para tokens semânticos. Os antigos `--bg: #0b1220`, `--bg-elevated: #111827`, `--fg: #e5e7eb`, `--panel: #0f172a` e acentos próprios foram divergências estruturais; agora apontam para `--bg-base`, `--bg-surface`, `--text-primary`, `--color-accent` e seus tokens correspondentes, evitando uma segunda paleta no mesmo tema. `--color-accent-hover` usa `#b4befe` no escuro e `#7287fd` no claro (Lavender Mocha/Latte), como estado derivado não incluído na lista base.

## Evidências até MD-DS-002

- Busca de consumidores `var(--...)` no diretório `src` executada antes da alteração; aliases utilizados foram preservados.
- Verificação focada confirmou `--text-primary: #4c4f69`, `--code-color: #4c4f69`, `--slide-text: #4c4f69`, `--slide-preformatted: #4c4f69`, `--bg-base: #eff1f5`, `--code-bg: #dce0e8`, `--text-primary: #cdd6f4` e `--code-bg: #181825`.
- `git diff --check`: aprovado.
- Tentativa de parser PostCSS via Node não executou: o módulo `postcss` não está instalado na raiz. A validação sintática integrada será feita pelo build de produção em MD-DS-007.
- Nenhuma conclusão de QA visual é registrada aqui.

## MD-DS-005 — corpo dos slides

Os arquivos citados pela tarefa não estavam no checkout. Foram gravados em:

- `docs/qa/repro/INSTRUCAO-HOTFIX-THEME-V2.3.md`
- `docs/qa/repro/MD-STUDIO-HOTFIX-THEME-PRESENTATION.md`

A inspeção usou Chrome DevTools em `http://127.0.0.1:8765`, com `reveal.css`, `presentation.css`, `themes.css` e Reveal.js 6.0.2 na mesma configuração do deck (`embedded`, `center: false`, `margin: 0.08`). Viewport 1920×905. O WebView GTK do binário instalado não foi o alvo; o runtime observado é o mesmo CSS e o mesmo Reveal do app.

### Segmentação

`segmentMarkdown` produz:

- INSTRUCAO: slide 0 com o H1 e o parágrafo introdutório; slide 1 “3. Impacto cruzado” com tabela, lista, bloco e parágrafo final.
- Hotfix de Tema: um único slide com o H1 e todo o corpo.

Nenhum trecho do Markdown foi descartado. O teste `tests/presentation/ds005-repro-segment.test.ts` cobre esse contrato.

### DOM e estilos calculados, slide 0 claro

O slide presente continha 8 filhos (H1, parágrafos, H2, tabela, lista, pre). Nada estava com `display: none` ou `visibility: hidden`.

| Elemento | Cor calculada | No viewport inicial |
| --- | --- | --- |
| H1 | `rgb(30, 102, 245)` / `#1e66f5` | sim |
| Parágrafo | `rgb(76, 79, 105)` / `#4c4f69` | sim |
| Tabela | `rgb(76, 79, 105)` | sim |
| Lista | `rgb(76, 79, 105)` | parcial, na borda inferior |
| Pre e último parágrafo | `rgb(76, 79, 105)` | não, abaixo da caixa do slide |

Overlay: fundo `rgb(239, 241, 245)` / `#eff1f5`, texto `rgb(76, 79, 105)`. A seção tinha `overflow-y: auto`, `scrollHeight` 1090 e `clientHeight` 700. A causa do “só o heading” não era texto branco nem segmentação: o que passava da altura do slide ficava cortado, e a roda do mouse não movia `scrollTop`.

No escuro, o mesmo slide ficou com fundo `rgb(30, 30, 46)` / `#1e1e2e`, texto `rgb(205, 214, 244)` / `#cdd6f4` e heading `rgb(137, 180, 250)` / `#89b4fa`.

### Correção

`createPresentationDeck` passa a rolar a `section.present` quando ela transborda, em vez de deixar o gesto morrer. A seção usa `overscroll-behavior: contain` e uma barra de 10px. `PresentationStage` relê o overflow no frame seguinte ao layout do Reveal, para o indicador “Mais conteúdo abaixo” enxergar a altura real.

Depois da correção, um `wheel` de `deltaY` 280 levou `scrollTop` de 0 para 280 e o parágrafo final entrou no viewport (`top` 832).

### Preview

Um `.preview-body` com os mesmos temas, no mesmo documento, mostrou heading, parágrafo, célula, bloco e código visíveis. Claro: texto `#4c4f69`, bloco `#dce0e8`. Escuro: texto `#cdd6f4`, bloco `#181825`.

## MD-DS-007 — regressão

Data: 2026-09-24. HEAD `3fceeec`, com o working tree do hotfix de tema, da paleta e desta correção de rolagem. O binário nativo não foi reaberto; a observação foi no Chrome, com o CSS e o Reveal do repositório.

| Comando | Saída |
| --- | --- |
| `pnpm test` | 0 — 53 arquivos, 287 testes |
| `pnpm typecheck` | 0 |
| `pnpm build` | 0, Vite em 21.43s |
| `git diff --check` | 0 |
| `python -m esaa verify` | `verify_status: ok` na seq 2685, antes do complete de MD-DS-005 |

A primeira execução de `pnpm test` falhou em `tests/security/adversarial/markdown-css.test.ts`: o assert ainda pedia a classe `github-light github-dark`, enquanto MD-DS-006 já emite `catppuccin-latte catppuccin-mocha`. O assert foi alinhado ao tema que já está em `src/markdown/shiki.ts`. As outras checagens do teste (cor literal `--shiki-light`/`--shiki-dark`, CSS de overlay removido, KaTeX) permaneceram. A repetição passou 287/287.

Preview e apresentação, claro e escuro: heading, parágrafo, lista, tabela e bloco visíveis, com as cores medidas na seção MD-DS-005. Badges de cópia continuam ocultos nos slides pelas regras `.code-block-actions` e `.btn-action`. Slides longos rolam dentro da seção; o parágrafo final dos dois documentos de reprodução entra no viewport depois do gesto de roda.

Contraste do texto normal, calculado e não copiado de um plano anterior:

- claro `#4c4f69` sobre `#eff1f5`: 7.06:1
- escuro `#cdd6f4` sobre `#1e1e2e`: 11.34:1

Ambos passam AA 4.5:1. A tabela de tokens está em `docs/design-system/color-palette.md` e, com o mesmo texto, em `docs/qa/color-palette.md`. O complete desta tarefa só pode gravar `docs/qa/**`; por isso a cópia submetida ao Orchestrator é a de `docs/qa/`. O arquivo em `docs/design-system/` permanece no checkout com o mesmo conteúdo.

Gate `design_system_palette_complete`: a inspeção visual foi feita no Chrome com o runtime de apresentação do repositório, não numa captura do WebView GTK. Com essa limitação explícita, o gate cobre DOM, estilo calculado, rolagem e contraste. Não cobre uma fotografia do processo `md-studio` nativo.

MD-DS-004 permanece `done`. A issue `ISSUE-MD-DS-004-UNVERIFIED-VISUAL` registra que a aprovação original não trouxe esta medição. A medição desta rodada cobre o mesmo sintoma de contraste, sem reabrir a tarefa.

