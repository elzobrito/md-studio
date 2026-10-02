# Verificação funcional e visual — MD-HOTFIX-SPLIT-CENTER-002

Data: 2026-09-29. Aplicação Vite local (`http://localhost:1420/`). O conteúdo usado foi temporário e não foi salvo: 60 seções, 239 linhas, aproximadamente 2.520 palavras.

## Evidência visual observada

Na janela CUA estreita disponível (imagem de 858×900 px), com split ativo, a barra lateral superior e o inspetor inferior ficam limitados; editor e preview aparecem lado a lado numa área central de aproximadamente 289 px. A barra global e a barra de status continuam visíveis. Com o mesmo documento, os modos Markdown e Formatado também mantêm a superfície central e a barra de status, e o conteúdo longo rola dentro do editor ou do preview.

A captura desktop anterior da tarefa de duplicidade foi feita em 1854×943 px; ela confirma o modo largo, mas não é contada como verificação visual do limite de 961 px para este hotfix.

## Verificação do breakpoint

A regressão `tests/layout/splitView.test.tsx` confirma que o limite `max-height: 28vh` para os painéis está dentro do mesmo `@media (max-width: 960px)` que empilha o workspace e que não resta um bloco separado em 900 px. Portanto, a regra cobre toda a faixa 901–960 px, inclusive os 904 px da reprodução reportada.

## Limitação de captura

O navegador fornecido expôs uma janela estreita de 858×900 px e uma janela desktop ampla; não ofereceu um controle documentado para fixar o viewport em 904×900 e 961×900. Uma tentativa de abrir um harness de teste por URL `data:` foi bloqueada pela política do navegador; não tentei outro método para contornar essa restrição. Assim, a validação visual exata nesses dois valores não foi obtida. A prova pós-correção combina inspeção visual nos modos com documento longo, teste estrutural do breakpoint responsivo e typecheck.
