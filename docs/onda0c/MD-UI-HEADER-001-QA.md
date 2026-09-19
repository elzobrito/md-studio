# QA: MD-UI-HEADER-001 (Header Polish & Dynamic Window Title)

## Escopo
- Remoção do branding duplicado `<strong>MD Studio</strong>` e marca interna do cabeçalho da aplicação.
- Título nativo dinâmico da janela:
  - Sem arquivo: `MD Studio`
  - Com arquivo: `MD Studio — nome.md`
  - Com alterações não salvas (dirty): `MD Studio — ● nome.md`
- Layout otimizado e mais compacto:
  - Esquerda: alternar painel lateral (`≡`) + seletor de modo de visualização (`ViewModeToggle`).
  - Direita: novo documento, configurações, alternar sumário e salvar.
- `ViewModeToggle` atualizado para utilizar o componente `Button` com variantes `primary` (ativo) e `ghost` (inativo).

## Verificação
- Verify Check: `top_bar_polish_pass`
- Testes automatizados: `tests/header/topBar.test.tsx` (3 testes cobrindo remoção de branding interno, formatação de títulos e botões do modo de visualização).
- Suíte completa: 27 arquivos de teste, 167 testes passando sem regressão.
