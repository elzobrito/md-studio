# SEC-010 — Segredos e configuração (22/09/2026)

Escopo: arquivos versionados em `f8eaf22`, busca estática com padrões de chave privada, tokens e atribuições `password`/`api_key`; inspeção de `index.html`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `.gitignore` e pontos de log. `gitleaks` não está disponível; histórico Git, binários, arquivos ignorados e `.env` locais não foram varridos.

| Check | Estado | Evidência/limite |
| --- | --- | --- |
| SC-001 segredos hardcoded | aprovado com confiança baixa | Busca heurística nos arquivos rastreados não retornou correspondências dos padrões aplicados. Ausência de match não prova ausência de segredo, sobretudo formatos desconhecidos. |
| SC-002 chaves API no frontend | aprovado com confiança média | `src/` não apresentou referências a API key/token de autenticação na busca textual; o aplicativo não tem integração de API autenticada identificada. |
| SC-003 `.env` commitados | aprovado | `git ls-files` não mostrou `.env` ou variantes rastreadas. `.gitignore` não contém regra `.env*`; recomenda-se acrescentá-la para prevenção, sem alegar vazamento atual. |
| SC-004 CORS permissivo | não aplicável | Sem servidor HTTP próprio ou `endpoint_base_url` para testar `Origin`; comandos expostos são Tauri IPC. |
| SC-005 debug em produção | aprovado com confiança média | `src-tauri/tauri.conf.json` distingue `devUrl` para desenvolvimento e `frontendDist` para build. Não foi inspecionado pacote binário instalado. CSP permite `unsafe-eval` e `unsafe-inline` para estilo, enfraquecimento de proteção de conteúdo a tratar no domínio frontend, não prova de debug mode. |
| SC-006 credenciais padrão | não aplicável | Não há fluxo de login/conta próprio identificado no aplicativo local. |
| SC-007 exemplos em produção | aprovado com confiança média | Não foram encontrados `.env.example`/`sample` ou configurações de demo rastreadas que forneçam credenciais; pacote final não foi inspecionado. |
| SC-008 variáveis sensíveis em logs | parcial | Pontos `console.error`/`console.warn` em `src/App.tsx`, `src/state/documentState.ts` e outros emitem objetos de erro; nenhuma impressão explícita de token/env foi encontrada. A mensagem de erro pode incluir caminho local; não houve exercício dinâmico ou revisão de todos os erros possíveis. |

Recomendações: rodar scanner dedicado sobre Git completo e artefatos de release, adicionar `.env*` ao ignore conforme política do projeto, revisar conteúdo de erros antes de logs e reduzir CSP permissiva quando compatível com Shiki/KaTeX/Tauri. Nenhum segredo foi exposto neste relatório.
