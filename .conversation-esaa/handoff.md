# Handoff para o Proximo Agente

> Gerado automaticamente por conv-sync.ps1 project. Contrato fixo abaixo.

Este diretorio usa um ESAA conversacional, nao o ESAA runtime formal.

## Ordem de leitura

1. state.md — objetivo, decisoes, tópicos e estado atual (projetado).
2. topics.json / topics.md — memória intermediária por assuntos.
3. tasks.json — tarefas abertas, concluidas e bloqueadas.
4. activity.jsonl — historico cronologico com event_id e source.
5. plans/v1-conversation-esaa-sync.md — plano de implementacao da sync v1.

## Contrato operacional

- Nao edite activity.jsonl, state.md ou handoff.md manualmente durante sync v1.
- Grok: hooks em .grok/hooks/conversation-esaa.json disparam sync-grok automaticamente.
- Codex: rode bin/codex-watch.ps1 (auto-sync) ou sync-codex manualmente apos cada sessao.
- Claude Code: hooks em .claude/settings.json disparam sync-claude automaticamente.
- Eventos sincronizados incluem agent_id em assistant (grok/codex/claude) e agent_id null em user.
- Nao trate .conversation-esaa como .roadmap.
- PRIVACIDADE: activity.jsonl/state.md/handoff.md contem texto bruto das conversas. Nao commite dados reais em repo publico. Ver PRIVACY.md e .gitignore.

## Comandos de sync

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .conversation-esaa\bin\conv-sync.ps1 verify -WorkspaceRoot C:\xampp\htdocs\esaa-conversational-lab
pwsh -NoProfile -ExecutionPolicy Bypass -File .conversation-esaa\bin\conv-sync.ps1 sync-grok -WorkspaceRoot C:\xampp\htdocs\esaa-conversational-lab -GrokSessionId <session-id>
pwsh -NoProfile -ExecutionPolicy Bypass -File .conversation-esaa\bin\conv-sync.ps1 sync-codex -WorkspaceRoot C:\xampp\htdocs\esaa-conversational-lab
pwsh -NoProfile -ExecutionPolicy Bypass -File .conversation-esaa\bin\conv-sync.ps1 sync-claude -WorkspaceRoot C:\xampp\htdocs\esaa-conversational-lab
pwsh -NoProfile -ExecutionPolicy Bypass -File .conversation-esaa\bin\conv-sync.ps1 project -WorkspaceRoot C:\xampp\htdocs\esaa-conversational-lab
```

## Trust Grok hooks

Adicione o projeto em ~/.grok/trusted-hook-projects e recarregue com /hooks → r.

## Tarefas abertas

- Nenhuma tarefa aberta.

## Proxima acao recomendada

Continuar a conversa; sync automatico mantem .conversation-esaa/ atualizado.
