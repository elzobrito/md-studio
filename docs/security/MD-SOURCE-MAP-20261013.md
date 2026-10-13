# Atualização de segurança source-map-js

Issue: ISS-MD-RELEASE-SOURCE-MAP-20261013. Tarefa: MD-SECURITY-SOURCE-MAP-20261013-001.

O gate local identificou GHSA-68fv-2mgg-jv7q (high): denial of service em offsets de seções de source maps indexados. Dependência transitiva do PostCSS/Vite. Atualizada somente a resolução de source-map-js 1.2.1 para 1.2.2 no lockfile, dentro dos ranges existentes. Nenhum ignore ou mudança de política.

Validação em candidato isolado: pnpm install --frozen-lockfile; pnpm audit --audit-level high (exit 0, quatro avisos low remanescentes em DOMPurify/KaTeX); pnpm typecheck; pnpm test (135 arquivos, 778 testes passaram). Os avisos low não são eliminados por esta correção e permanecem registrados, sem declaração de auditoria sem vulnerabilidades.

Fonte primária: https://github.com/advisories/GHSA-68fv-2mgg-jv7q. Logs locais: /tmp/md-release-pnpm-audit.json e /tmp/md-security-validation.log.
