# SEC-023 — Auditar Segurança de Dados (Reauditoria 23/09/2026)

MD Studio pós-remediação da política de retenção de rascunhos.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| DA-001 Dados sensíveis armazenados sem proteção | partial | Rascunhos locais em localStorage com identidade estável por raiz canônica + caminho relativo; proteção depende do SO do host. |
| DA-002 Dados excessivos armazenados | partial | Recentes e índice persistem metadados estritamente locais para navegação; sem telemetria ou envio remoto. |
| DA-003 Ausência de política de retenção | pass | Política de retenção de 90 dias implementada com aviso visual aos 75 dias, expurgo periódico, isolamento em modo navegador e diálogo manual de inspeção/recuperação/exclusão (DraftRecoveryDialog.tsx e recovery.ts, 100% testado em draft-retention.test.ts). |
| DA-004 Ausência de anonimização | not_applicable | Sem analytics ou telemetria agregada no produto. |
| DA-005 Não conformidade com LGPD/GDPR | partial | Governança de privacidade demonstrada em armazenamento local estrito e expurgo transparente sob controle do usuário. |
