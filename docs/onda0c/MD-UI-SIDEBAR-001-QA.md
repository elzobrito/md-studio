# QA: MD-UI-SIDEBAR-001 (Sidebar Hierarchy & Shared Button Component)

## Escopo
- Componente compartilhado `Button` (`src/components/ui/Button.tsx`) + estilos (`src/styles/button.css`):
  - Variantes: `primary`, `secondary`, `ghost`.
  - Tamanhos: `sm`, `md`.
  - Suporte a `fullWidth`, `icon`, `disabled`, `type="button"`.
  - Raio de borda unificado `--radius-btn: 6px`.
- Hierarquia na Sidebar (`FileExplorer.tsx`):
  - "Abrir pasta" como `primary` e "Abrir arquivo" como `secondary` com mesmo raio de borda e tamanho.
  - Seção de arquivos recentes (`RecentFiles.tsx`) com peso secundário e separador visual delimitado com linha.
  - Remoção da mensagem solta "Nenhum workspace aberto." da barra lateral.

## Verificação
- Verify Check: `sidebar_hierarchy_pass`
- Testes automatizados: `tests/ui/button.test.tsx` (3 testes cobrindo variantes, tamanhos, estados e ícones).
- Suíte completa: 26 arquivos de teste, 164 testes passando sem regressão.
