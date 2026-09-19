# Onda 0C — UI Polish | MD-UI-SIDEBAR-001
**Para o agente executor.** Cadastro ESAA já existe (`todo`). Implementar até done com prova.
**WBS:** `docs/onda0c/WBS-ONDA-0C-UI-POLISH-v2.1.md`
**Repo:** `/home/elzobrito/desenvolvimento/md-studio` (branch `main`)
**Pré-condição:** Onda 0B (`MD-GM-001`…`008`) e splash (`MD-UI-SPLASH-001`) já **done**. NÃO reabrir splash. NÃO reinventar o que já existe — só o delta desta task.

## Regras de execução
1. `claim` → implementar → provar → `complete` com evidência → pedir review.
2. Paths abaixo são os **reais** do tree. Não criar arquivos paralelos com nomes do WBS 2.0 antigo.
3. Não quebrar vitest da 0B, open `.md` pelo SO, nem single-instance.
4. Temas dark e light.
5. Done = critério de aceite + verify id abaixo com prova (comando/log/screenshot em `docs/qa/`).


## Objetivo
Hierarquia clara na sidebar: **ações de abrir > recentes**. Criar `Button` compartilhado (base do design system).

## Estado atual
- Sem workspace: botões "Abrir pasta" / "Abrir arquivo" em `src/components/FileExplorer.tsx`.
- Recentes: `src/components/explorer/RecentFiles.tsx`.
- Não existe `src/components/ui/Button.tsx`.

## Trabalho
1. **Criar** `src/components/ui/Button.tsx` + `src/styles/button.css`
   - variants: `primary` | `secondary` | `ghost`
   - sizes: `sm` | `md`
   - props: `fullWidth`, `icon?`, disabled, type=button
2. Sidebar vazia: Abrir pasta = `primary`; Abrir arquivo = `secondary` (mesmo radius/padding).
3. Separador visual "Recentes" (label menor + linhas); itens compactos (peso secundário).
4. Remover mensagem solta "Nenhum workspace…" da sidebar se ainda existir (empty fica no centro).
5. Exportar Button de forma fácil de importar nas tasks HEADER/BUTTONS.

## Artefatos
- NEW: `src/components/ui/Button.tsx`
- NEW: `src/styles/button.css` (+ import no CSS entry)
- MOD: `src/components/FileExplorer.tsx`
- MOD: `src/components/explorer/RecentFiles.tsx`
- MOD: estilos explorer / file-tree conforme necessário

## Fora
Migrar todos os botões da app (task BUTTONS-001). Welcome CTAs (EMPTY-001 pode continuar com classes empty-state até BUTTONS migrar).

## Acceptance criteria
- [ ] Button component existe e é usado na sidebar
- [ ] Abrir pasta primary; Abrir arquivo secondary; mesmo border-radius
- [ ] Recentes visualmente secundários + separador
- [ ] Sem copy "nenhum workspace" solta na sidebar

**Verify:** `sidebar_hierarchy_pass`
