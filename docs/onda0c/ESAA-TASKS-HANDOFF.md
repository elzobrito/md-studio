# Onda 0C — Pacote de execução para o agente

Você é o **agente executor** do MD Studio no Nitro.
Repo: `/home/elzobrito/desenvolvimento/md-studio`
WBS: `docs/onda0c/WBS-ONDA-0C-UI-POLISH-v2.1.md`

## Contexto
Onda 0B Guided Markdown e splash **já estão done**. Sua onda é **0C UI Polish** (coesão visual). Não reimplemente splash. Não invente paths — use só os das tasks FULL.

## Ordem
1. `MD-UI-EMPTY-001`
2. `MD-UI-PANEL-001` (pode paralelizar com EMPTY)
3. `MD-UI-SIDEBAR-001`
4. `MD-UI-HEADER-001` (depois de SIDEBAR)
5. `MD-UI-BUTTONS-001` (depois de SIDEBAR)
6. `MD-UI-QA-001` (por último)

## Protocolo ESAA (obrigatório)
```bash
ROOT=/home/elzobrito/desenvolvimento/md-studio
python3 -m esaa --root "$ROOT" claim MD-UI-EMPTY-001 --actor <seu-actor>
# ... implementar + provar ...
python3 -m esaa --root "$ROOT" complete MD-UI-EMPTY-001 --actor <seu-actor> ...
python3 -m esaa --root "$ROOT" verify
```
Leia a description completa:
```bash
python3 -m esaa --root "$ROOT" state MD-UI-EMPTY-001
# ou
cat docs/onda0c/MD-UI-EMPTY-001-FULL.md
```

## Tasks (resumo)

| ID | O que fazer | Verify |
|----|-------------|--------|
| MD-UI-EMPTY-001 | CTA primary=Abrir pasta; empty/welcome delta | empty_state_polish_pass |
| MD-UI-PANEL-001 | × no sumário + [sumário] na status bar; store já existe | collapsible_panel_pass |
| MD-UI-SIDEBAR-001 | Criar Button; hierarquia ações>recentes | sidebar_hierarchy_pass |
| MD-UI-HEADER-001 | Remover título interno; window title dinâmico | top_bar_polish_pass |
| MD-UI-BUTTONS-001 | Auditoria + migrar hotspots para Button | design_system_pass |
| MD-UI-QA-001 | Checklist + regressão 0B/splash/OS open + docs/qa | onda_0c_ui_polish_complete |

## Paths âncora (reais)
- Welcome/Empty: `src/components/empty/*`, `src/styles/empty-state.css`
- UI store: `src/state/ui.ts`
- Outline: `src/components/DocumentOutline.tsx`
- Status: `src/components/statusbar/StatusBar.tsx`
- Explorer: `src/components/FileExplorer.tsx`, `src/components/explorer/RecentFiles.tsx`
- Header: `src/components/header/AppHeader.tsx`
- Splash (NÃO TOCAR salvo regressão): `splashscreen.html`, `src-tauri/`

## Definition of done da onda
Empty coerente + painel que some de verdade + sidebar com hierarquia + header sem título duplicado + botões no mesmo sistema + QA com prova. Sem splash nova.

## Proibido
- Declarar done sem prova
- Criar `welcome-screen.css` / `outline/DocumentOutline.tsx` paralelos
- Reabrir ou reescrever splash “por polish”
- Quebrar open-file-from-OS ou testes da 0B


Detalhes: `MD-UI-*-FULL.md` e descriptions no ESAA.
