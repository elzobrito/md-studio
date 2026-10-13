# Compatibilidade das ferramentas do gate

Tarefa MD-SECURITY-TOOLS-COMPAT-20261013-002, sucessora da primeira tentativa. Semgrep1.140.0 fixa MCP1.16.0, que importa eval_type_backport removido do Pydantic2.14.1 resolvido atualmente. Fixado Pydantic2.11.10 no instalador. O runtime local Python3.14 não é suportado pelo pydantic-core desse pin (PyO3 suporta até3.13); o instalador permite MD_SECURITY_PYTHON explícito. Validação limpa local em Python3.11, alinhado ao actions/setup-python3.11 do CI. Não foi usado bypass de PyO3 nem reduzida política de scans.

Gate completo do candidato passou: pnpm audit (quatro low, zero high/critical), cargo audit nos dois locks, gitleaks diretórios/histórico, Semgrep107 regras/13128 arquivos/zero findings, typecheck, Vitest135 arquivos/778 testes. Log: /tmp/md-security-compat-gate.log. Scans mantém skips originais da ferramenta (arquivos grandes/ignores), sem alegar cobertura integral.

Drift verdict warning em .esaa/analysis/MD-SECURITY-TOOLS-COMPAT-20261013-002-drift.yaml: scripts/install-security-tools.sh old:6-7/new:6-7 fora do grafo de rastreabilidade, dentro do grant explícito. Sem violation.
