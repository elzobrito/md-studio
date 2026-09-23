# Boas práticas de segurança — MD Studio (23/09/2026)

Recomendações contínuas alinhadas aos frameworks OWASP ASVS, CIS Controls v8 e NIST SSDF:

1. **Frontend & Sanitização:** manter testes de regressão de CSS em qualquer atualização do pipeline Shiki/KaTeX/Unified.
2. **DevSecOps:** executar regularmente `scripts/security-gates.sh` antes de commits e releases.
3. **Dependências:** monitorar advisories de dependências transitivas do ecossistema Tauri e planejar migração futura quando novos releases estiverem estáveis.
4. **Privacidade de Rascunhos:** preservar isolamento estrito de rascunhos no armazenamento local, sem nunca enviar rascunhos para rede.
