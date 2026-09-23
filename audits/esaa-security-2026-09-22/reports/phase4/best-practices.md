# SEC-041 — Boas práticas por domínio

As referências abaixo são guias gerais, não prova de conformidade do MD Studio. Controles HTTP/login/upload/LLM são condicionais porque o produto auditado é um editor Tauri local.

## secrets_config

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Manter segredos fora do código e fazer varredura de histórico/artefatos.
- Referência: https://csrc.nist.gov/pubs/sp/800/218/final

## dependencies_supply_chain

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Usar lockfile estrito e auditorias periódicas de dependências.
- Referência: https://csrc.nist.gov/pubs/sp/800/218/final

## authentication

- Aplicabilidade: condicional (domínio sem checks aplicáveis no produto atual).
- Prática: Se login for introduzido, exigir autenticação robusta e MFA proporcional ao risco.
- Referência: https://owasp.org/projects/asvs

## authorization

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Manter validações de caminho e operações nativas no Rust, não só na UI.
- Referência: https://owasp.org/projects/asvs

## api_security

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Se API HTTP surgir, aplicar validação, limites e inventário versionado.
- Referência: https://owasp.org/projects/asvs

## input_validation

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Sanitizar HTML/CSS não confiável e validar tamanho/forma antes de sinks.
- Referência: https://owasp.org/projects/asvs

## file_upload

- Aplicabilidade: condicional (domínio sem checks aplicáveis no produto atual).
- Prática: Se upload remoto surgir, validar tipo/tamanho/nome e isolar armazenamento.
- Referência: https://owasp.org/projects/asvs

## session_security

- Aplicabilidade: condicional (domínio sem checks aplicáveis no produto atual).
- Prática: Se sessão autenticada surgir, definir cookie seguro, expiração e CSRF conforme arquitetura.
- Referência: https://owasp.org/projects/asvs

## cryptography

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Usar primitivas modernas para integridade; documentar proteção de dados locais.
- Referência: https://owasp.org/projects/asvs

## security_headers

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Endurecer CSP da WebView e reavaliar unsafe-eval/unsafe-inline.
- Referência: https://owasp.org/projects/asvs

## logging_monitoring

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Evitar dados de documento/paths em logs e usar mensagens de erro reduzidas.
- Referência: https://www.cisecurity.org/controls/cis-controls-navigator/v8

## infrastructure

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Documentar backup e proteção do host que armazena os documentos locais.
- Referência: https://www.cisecurity.org/controls/cis-controls-navigator/v8

## devsecops

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Introduzir gates verificáveis de testes, SAST, secrets e dependências no CI.
- Referência: https://csrc.nist.gov/pubs/sp/800/218/final

## data_security

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Definir retenção de rascunhos e comunicar onde dados locais persistem.
- Referência: https://www.cisecurity.org/controls/cis-controls-navigator/v8

## frontend_security

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Separar conteúdo Markdown não confiável de HTML/CSS executado pela WebView.
- Referência: https://owasp.org/projects/asvs

## ai_llm_security

- Aplicabilidade: condicional (domínio sem checks aplicáveis no produto atual).
- Prática: Se LLM for integrado, avaliar prompt injection, acesso a ferramentas e custos.
- Referência: https://csrc.nist.gov/pubs/sp/800/218/final

## business_logic

- Aplicabilidade: aplicável ao código/processo auditado.
- Prática: Testar concorrência de save/overwrite e confirmação de ações destrutivas.
- Referência: https://owasp.org/projects/asvs

Fontes oficiais: [OWASP ASVS](https://owasp.org/projects/asvs), [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final), [CIS Controls v8](https://www.cisecurity.org/controls/cis-controls-navigator/v8).
