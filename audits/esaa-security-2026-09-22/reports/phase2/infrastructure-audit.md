# SEC-021 — Auditar Infraestrutura

MD Studio, HEAD f8eaf22. Revisão estática do produto local Tauri; nenhum código foi alterado.

Desktop local; controles de rede de servidor não se aplicam. Inventário de deploy versionado inclui Snap e workflows, mas nenhum Dockerfile/docker-compose.

| Check | Resultado | Evidência/limite |
| --- | --- | --- |
| IF-001 HTTPS opcional | not_applicable | Sem listener HTTP próprio; HTTPS de registries/GitHub externos está fora do produto. |
| IF-002 Ausência de firewall | not_applicable | Firewall do host do usuário não é configurado por aplicativo desktop. |
| IF-003 Ausência de WAF | not_applicable | Sem serviço web próprio para WAF. |
| IF-004 Network segmentation ausente | not_applicable | Sem rede de serviços da aplicação a segmentar. |
| IF-005 Backups não configurados | partial | Documentos ficam em diretórios escolhidos pelo usuário; estratégia de backup do usuário/host não é observável no repositório. |
| IF-006 Proteção contra DDoS ausente | not_applicable | Sem endpoint de rede exposto para DDoS. |
| IF-007 Container hardening ausente | not_applicable | Nenhum Dockerfile ou serviço docker-compose no repositório; Snap não é container Docker. |

Fontes inspecionadas: `snap/snapcraft.yaml`, `.github/workflows/ci.yml`, `.github/workflows/build-windows.yml`, `src-tauri/tauri.conf.json`.

Limite geral: sem teste do pacote Tauri instalado, sem infraestrutura externa e sem afirmação de exploração para checks parciais.
