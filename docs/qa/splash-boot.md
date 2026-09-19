# QA & Design: Splash Screen no Boot (MD-UI-SPLASH-001)

## Resumo
Implementação de Splash Screen nativa e estática no boot do **MD Studio** para eliminar o atraso perceptível e o "flash branco / webview vazia" antes do React carregar e o workspace estar pronto para uso.

## Arquitetura Implementada

### 1. Configuração de Janelas Tauri 2 (`src-tauri/tauri.conf.json`)
- **Janela Principal (`main`)**:
  - Configurada com `"visible": false` no boot.
  - Não renderiza em tela enquanto o bundle React e os estilos estiverem inicializando.
- **Janela Splashscreen (`splashscreen`)**:
  - `label`: `"splashscreen"`
  - `url`: `"splashscreen.html"`
  - Dimensões: 420x280 (centralizada, sem bordas/decorações, `alwaysOnTop: true`).
  - Carrega arquivo HTML estático ultraleve (`splashscreen.html`), sem overhead de compilação ou execução de JS complexo.

### 2. Splash Screen Estática (`splashscreen.html` e `public/splashscreen.html`)
- Fundo escuro `#181818` alinhado ao design system do MD Studio.
- Ícone estilizado do MD Studio `M↓`.
- Indicador de progresso pulsante e mensagem "Iniciando workspace...".

### 3. Comunicação e Transição (`src-tauri/src/lib.rs`)
- **Comando `close_splash`**:
  ```rust
  #[tauri::command]
  pub async fn close_splash(app: tauri::AppHandle) -> Result<(), String> {
      if let Some(splash) = app.get_webview_window("splashscreen") {
          let _ = splash.close();
      }
      if let Some(main) = app.get_webview_window("main") {
          let _ = main.show();
          let _ = main.set_focus();
      }
      Ok(())
  }
  ```
- **Sinalização no Frontend (`src/App.tsx`)**:
  - Quando o componente raiz `App` completa sua primeira renderização útil, invoca `close_splash`.
  - A splash é encerrada e a janela principal recebe foco instantaneamente.

### 4. Mecanismos de Confiabilidade e Resiliência
- **Timeout de Segurança de 6 segundos**:
  - Caso o frontend sofra algum atraso ou falha inesperada, uma tarefa assíncrona do Tokio em `src-tauri/src/lib.rs` automaticamente fecha a splash e exibe a janela principal após 6 segundos, garantindo que o usuário nunca fique preso na splashscreen.
- **Single Instance & Abertura de Arquivos pelo SO**:
  - O manipulador `single_instance` fecha a splashscreen (se ainda estiver ativa) e foca a janela `main`.
  - O fluxo de detecção e repasse de arquivo passado via linha de comando (`launch_path` / `app://open-file`) é preservado integralmente.

## Verificação e Critérios de Aceitação
1. [x] Cold start mostra splash sem flash branco da janela principal vazia.
2. [x] Splash fecha assim que a UI principal está montada e pronta; main recebe foco.
3. [x] Abertura de arquivo `.md` pelo SO continua funcionando perfeitamente sem perda de eventos.
4. [x] Single instance não reabre splash na segunda invocação.
5. [x] Timeout de segurança de 6s implementado no backend Tauri.
6. [x] Zero regressões no backend Rust (`cargo test` 34 testes ok) e no frontend (`vitest` 154 testes ok).
