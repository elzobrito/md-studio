# Diagnósticos Operacionais e Troubleshooting — MD Studio

## 1. Códigos de Erro IPC Públicos

O backend Tauri 2 intercepta e tipa formalmente todos os erros de I/O e segurança antes de transmiti-los ao frontend. Mensagens ao usuário são curtas, claras e em pt-BR; nenhum caminho interno sensível do SO ou stack trace de baixo nível é vazado na UI:

| Código IPC | Causa Provável | Ação da UI / Remediação |
| :--- | :--- | :--- |
| `OutsideWorkspace` | Tentativa de acessar arquivo fora da pasta raiz do workspace aberto. | Rejeitado pelo Rust (*Path Fencing*). A UI exibe alerta de limite de workspace. |
| `SymlinkEscape` | Link simbólico apontando para fora do workspace vault. | Bloqueado por contenção estrita. |
| `HashMismatch` | O arquivo em disco foi modificado externamente após a última leitura/gravação. | Aciona o modal `ConflictDialog` (*Recarregar do Disco*, *Manter Edição*, *Salvar Como*). |
| `NotFound` | O arquivo ou subpasta foi removido ou renomeado externamente. | Atualiza a árvore de arquivos e notifica no status. |
| `PermissionDenied` | Falta de privilégios de leitura/escrita no sistema de arquivos local. | Alerta visual de permissão sem falha fatal do processo. |
| `InvalidPath` | Caracteres inválidos ou caminho malformado recebido via IPC. | Rejeitado na validação de entrada. |
| `IoError` | Falha de disco, falta de espaço em disco ou erro genérico de hardware. | Alerta com mensagem segura ao usuário. |

---

## 2. Diagnóstico de Interface Gráfica e WebKitGTK (Tela em Branco)

### Sintoma
Ao iniciar o aplicativo no Linux (frequente em **Slackware**, distribuições minimalistas, ambientes com drivers proprietários NVIDIA legados ou sessões específicas de XWayland), a janela do MD Studio é criada, porém o conteúdo interno permanece **totalmente em branco ou transparente**.

### Causa Técnica
O WebKitGTK 4.1 utiliza aceleração gráfica por hardware através do protocolo **DMA-BUF**. Em sistemas onde o driver OpenGL/Mesa não suporta renderização com mapeamento direto de memória ou onde o compositor gráfico falha ao negociar o buffer, a Webview não conclui a pintura dos frames.

### Remediação
Desative o renderizador DMA-BUF exportando a variável de ambiente correspondente antes de invocar o processo:

```bash
# Execução direta
WEBKIT_DISABLE_DMABUF_RENDERER=1 md-studio

# No caso de uso com AppImage
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./md-studio_*.AppImage

# Persistência no perfil do usuário (~/.bashrc ou ~/.profile)
export WEBKIT_DISABLE_DMABUF_RENDERER=1
```

Essa configuração força o WebKitGTK a utilizar buffers de composição padrão (software/OpenGL tradicional), resolvendo instantaneamente o problema sem degradação na experiência do editor.

---

## 3. Diagnóstico de Monitoramento de Arquivos (`inotify`)

### Sintoma
Workspaces muito extensos (milhares de arquivos `.md`) deixam de emitir alertas de alteração externa ou o aplicativo falha ao monitorar pastas profundas.

### Causa Técnica
O sistema operacional atingiu o teto máximo de descritores de monitoramento por usuário configurado no kernel Linux (`fs.inotify.max_user_watches`).

### Remediação
Verifique e eleve o limite no sistema operacional:

```bash
# Verificar limite atual
cat /proc/sys/fs/inotify/max_user_watches

# Aumentar temporariamente
sudo sysctl fs.inotify.max_user_watches=524288

# Aumentar permanentemente (/etc/sysctl.d/99-inotify.conf)
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.d/99-inotify.conf
sudo sysctl --system
```

---

## 4. Diagnóstico de Concorrência e Auto-Save Silencioso

- O MD Studio grava arquivos atômicos (`.{nome}.tmp-{pid}` -> `fsync` -> `rename`).
- Para impedir falso alarme no diálogo de conflito, o backend Rust registra o hash SHA-256 e timestamp das gravações originadas pelo próprio app.
- Eventos recebidos do `inotify` com o mesmo hash gravado nos últimos 2000ms são descartados silenciosamente pelo `WatcherHub`.
- Se o arquivo for alterado por processo externo (`git checkout`, outro editor, terminal), o hash não coincidirá e o diálogo `ConflictDialog` será ativado para proteger os dados do autor.
