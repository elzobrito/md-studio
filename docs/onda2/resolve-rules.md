# Regras de resolução de wiki links

O motor resolve apenas contra o `MetadataIndex` em memória; ele não lê o disco.

Ordem de precedência:

1. Caminho relativo exato, sensível a maiúsculas, com ou sem a extensão `.md`.
2. Nome-base (`stem`) do arquivo, sem distinção ASCII entre maiúsculas e minúsculas.
3. Título do documento, sem distinção ASCII entre maiúsculas e minúsculas.

Um único candidato produz `resolved` e seu caminho. Nenhum candidato produz
`unresolved`. Dois ou mais candidatos no mesmo nível produzem `ambiguous`, sem
escolha silenciosa, e retornam a lista ordenada de caminhos candidatos.

Targets vazios, absolutos ou com componentes `..` são `unresolved`. O alias não
participa da busca: é preservado exclusivamente para apresentação.
