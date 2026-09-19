# QA: MD-UI-EMPTY-001 (Empty State & Welcome Screen Polish)

## Escopo
- Reordenar e repesar CTAs no `WelcomeScreen.tsx`:
  - `primary`: Abrir Pasta
  - `secondary`: Abrir Arquivo
  - `ghost`: Novo Documento (quando disponível)
- Garantir ausência de ícone de interrogação `?` (usa 📝 no Welcome e 📄 no EmptyState).
- Hint `Ctrl+P` visível em ambos os estados.
- Orquestração no `App.tsx`:
  1. Sem workspace: exibe `WelcomeScreen` (com CTAs ordenados e lista de recentes).
  2. Workspace sem arquivo ativo: exibe `EmptyState` ("Selecione um arquivo na árvore", atalho Ctrl+P).
  3. Com arquivo ativo (ou após Novo Documento): exibe editor markdown.

## Verificação
- Verify Check: `empty_state_polish_pass`
- Testes automatizados: `tests/empty/emptyState.test.tsx` (3 testes cobrindo hierarquia, ícones e copy).
- Suíte completa: 24 arquivos de teste, 157 testes passando sem regressão.
