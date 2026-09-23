# SEC-025 — Auditar Segurança de IA/LLM

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Nenhuma integração LLM/IA, modelo, prompt, ferramenta agente, token budget ou custo por chamada no MD Studio. Shiki/KaTeX/Mermaid são renderizadores, não modelos de IA.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| AI-001 Prompt injection possível | not_applicable | Sem modelo LLM, provider, versão, checksum, ferramentas de agente, prompt, max_tokens, rate limit ou cost tracking no produto. |
| AI-002 LLM com acesso irrestrito a ferramentas | not_applicable | Sem modelo LLM, provider, versão, checksum, ferramentas de agente, prompt, max_tokens, rate limit ou cost tracking no produto. |
| AI-003 Ausência de filtragem de input | not_applicable | Sem modelo LLM, provider, versão, checksum, ferramentas de agente, prompt, max_tokens, rate limit ou cost tracking no produto. |
| AI-004 Possibilidade de exfiltração de dados | not_applicable | Sem modelo LLM, provider, versão, checksum, ferramentas de agente, prompt, max_tokens, rate limit ou cost tracking no produto. |
| AI-005 Logs de decisão da IA inexistentes | not_applicable | Sem modelo LLM, provider, versão, checksum, ferramentas de agente, prompt, max_tokens, rate limit ou cost tracking no produto. |
| AI-006 Proveniência de modelos e dados de treino | not_applicable | Sem modelo LLM, provider, versão, checksum, ferramentas de agente, prompt, max_tokens, rate limit ou cost tracking no produto. |
| AI-007 Consumo não limitado (token budget / DoS wallet) | not_applicable | Sem modelo LLM, provider, versão, checksum, ferramentas de agente, prompt, max_tokens, rate limit ou cost tracking no produto. |

Fontes inspecionadas: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
