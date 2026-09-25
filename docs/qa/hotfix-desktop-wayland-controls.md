# Hotfix: Restauração de controles de janela no Ubuntu GNOME/Wayland

Data: 2026-09-25  
Tarefa: MD-HOTFIX-DESKTOP-003  
Issue: ISSUE-MD-DESKTOP-CONTROLS-REGRESSION  
Lição: LES-0004  
Invariante: INV-DESKTOP-LAUNCHER-ENV  

## 1. Sintomas Confirmados

* O usuário reportou que os botões minimizar, maximizar e fechar da barra de títulos voltaram a ficar inertes (sem resposta a cliques do mouse) na janela restaurada (não maximizada).
* A sessão do usuário é Ubuntu 24.04 / GNOME sobre Wayland (`SESSION_TYPE=wayland`, `DESKTOP=ubuntu:GNOME`).
* O comportamento coincide com o bug upstream documentado em Tauri/TAO 0.35.x (#13440 / PR #1218).

## 2. Causa-Raiz Identificada

No dia 24/09, durante a tarefa `MD-BUILD-UBUNTU-001`, os lançadores locais em `~/.local/share/applications/` foram regerados para incorporar a flag `WEBKIT_DISABLE_DMABUF_RENDERER=1`. Durante essa edição, a flag `GDK_BACKEND=x11` (estabelecida originalmente no hotfix `MD-HOTFIX-DESKTOP-002`) foi acidentalmente omitida, forçando a execução da janela através do backend Wayland nativo do GTK, reativando a inércia dos botões de controle de janela.

## 3. Correções Aplicadas

1. **Lançadores Desktop User-Local (`~/.local/share/applications/`):**
   * Atualizados `md-studio.desktop` e `MD Studio.desktop` com:
     ```ini
     Exec=/usr/bin/env GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 /home/elzobrito/.local/bin/md-studio %F
     ```
   * Banco de dados local sincronizado via `update-desktop-database ~/.local/share/applications`.

2. **Template do Pacote Linux (`src-tauri/linux/md-studio.desktop`):**
   * Linha de template sincronizada para conter ambas as diretivas:
     ```desktop
     Exec=/usr/bin/env GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 {{exec}} %F
     ```

3. **Teste Automatizado Preventivo:**
   * Criado `tests/desktop/desktop-launcher.test.ts` validando estaticamente a presença de `GDK_BACKEND=x11`, `WEBKIT_DISABLE_DMABUF_RENDERER=1` e `%F` tanto no template do repositório quanto nos arquivos `.desktop` locais do usuário.

4. **Governança Traceability & ESAA:**
   * Invariante `INV-DESKTOP-LAUNCHER-ENV` cadastrada em `.esaa/traceability/invariants.yaml` e consolidada no `graph.json` via `build_graph.py` e `validate.py` (0 erros críticos).
   * Registrada a issue `ISSUE-MD-DESKTOP-CONTROLS-REGRESSION` no event store e projeção `issues.json`.
   * Registrada a lição aprendida `LES-0004` no event store e projeção `lessons.json`.

## 4. Evidências de Verificação

* `pnpm test -- tests/desktop/desktop-launcher.test.ts`: 3/3 testes aprovados.
* `pnpm test -- tests/settings/settingsPanel.test.tsx`: 7/7 testes aprovados.
* `python3 .esaa/traceability/tools/build_graph.py`: concluído com sucesso (770 nós, 2605 arestas, 11 invariantes).
* `python3 .esaa/traceability/tools/validate.py`: status `pass`, 0 erros críticos.
