# SEC-022 — Auditar DevSecOps (Reauditoria 23/09/2026)

MD Studio pós-remediação de DevSecOps.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| DO-001 Ausência de code review | partial | PR aciona CI; revisores obrigatórios e branch protection são controles de governança de repo. |
| DO-002 Pipeline sem análise de segurança | pass | Gates de segurança adicionados em `.github/workflows/security-gates.yml` e `security-gates.sh` com pnpm/cargo audit; testes e typecheck estritamente bloqueantes sem `|| true`. |
| DO-003 Secrets scanning ausente | pass | Gitleaks integrado em `.github/workflows/security-gates.yml` e `security-gates.sh`. |
| DO-004 SAST não implementado | pass | Semgrep integrado em `.github/workflows/security-gates.yml` e `security-gates.sh`. |
| DO-005 DAST não implementado | not_applicable | Sem aplicação HTTP exposta para DAST web. |
| DO-006 Deploy sem auditoria | partial | Deploy de release validado por testes e gates prévios; assinatura externa mantida como controle de plataforma. |
