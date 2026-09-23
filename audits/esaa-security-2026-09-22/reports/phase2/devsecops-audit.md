# SEC-022 — Auditar DevSecOps

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Workflows versionados lidos: ci.yml, build-windows.yml e configuração Snap. Configurações externas do GitHub (branch protection e approvals) não foram consultadas.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| DO-001 Ausência de code review | partial | PR aciona CI, mas branch protection/revisores obrigatórios são configuração externa não observada. |
| DO-002 Pipeline sem análise de segurança | fail | CI não executa pnpm audit/cargo audit; typecheck e testes do workflow principal usam || true. |
| DO-003 Secrets scanning ausente | fail | Nenhum gitleaks/secret scan nos workflows versionados. |
| DO-004 SAST não implementado | fail | Nenhum SAST/CodeQL/semgrep nos workflows versionados. |
| DO-005 DAST não implementado | not_applicable | Sem aplicação HTTP exposta para DAST web; testes desktop adversariais seriam o equivalente. |
| DO-006 Deploy sem auditoria | partial | Workflow Windows publica artefatos em release por tag, sem gate de auditoria de dependências; aprovação externa não observável. |

Fontes inspecionadas: `.github/workflows/ci.yml`, `.github/workflows/build-windows.yml`, `snap/snapcraft.yaml`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
