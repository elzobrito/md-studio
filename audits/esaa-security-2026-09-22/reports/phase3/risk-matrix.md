# Matriz de riscos — MD Studio

| Finding | Severidade | C/I/A | Esforço | Recomendação |
| --- | --- | --- | --- | --- |
| SEC-022-DO-002-001 | MEDIUM | 1/1/1 | M | Introduzir gates de pnpm/cargo audit, secret scan e SAST; tornar typecheck/test bloqueantes. |
| SEC-024-FE-002-001 | MEDIUM | 0/2/1 | M | Separar CSS gerado por Shiki do HTML bruto e bloquear position/inset/z-index de conteúdo. |
| SEC-011-DS-002-001 | LOW | 0/0/1 | M | Atualizar árvore transitiva de forma compatível e reexecutar cargo audit/testes. |
| SEC-011-DS-006-001 | LOW | 0/1/1 | S | Remover fallback, usar instalação congelada e toolchain Rust fixada/--locked. |
| SEC-023-DA-003-001 | LOW | 1/0/0 | S | Definir prazo e limpeza de rascunhos abandonados; informar usuário sobre armazenamento local. |
| SEC-026-BL-003-001 | INFO | 0/1/1 | M | Adicionar teste concorrente e considerar operação por handle/no-follow ou serialização por caminho. |

Escala CIA: 0 nenhum, 3 alto. Severidades refletem pré-condições de uso local e nível de comprovação.
