use std::collections::HashSet;

/// Extrai tags (#tag, #local-first, #tag_name) do conteúdo Markdown.
/// Ignora cabeçalhos Markdown (# Heading), blocos de código e código inline.
pub fn parse_tags(content: &str) -> Vec<String> {
    let mut tags = Vec::new();
    let mut seen = HashSet::new();
    let mut in_code_block = false;
    let mut fence_char = '\0';
    let mut fence_len = 0;

    for line in content.lines() {
        let trimmed = line.trim_start();

        // Checar fences de bloco de código (``` ou ~~~)
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            let ch = trimmed.chars().next().unwrap_or('`');
            let count = trimmed.chars().take_while(|&c| c == ch).count();
            if !in_code_block {
                in_code_block = true;
                fence_char = ch;
                fence_len = count;
                continue;
            } else if ch == fence_char && count >= fence_len {
                in_code_block = false;
                continue;
            }
        }

        if in_code_block {
            continue;
        }

        // Se a linha começa como um Heading Markdown (# Título, ## Título, etc.)
        // Um heading tem 1 a 6 '#' seguidos obrigatoriamente por espaço ou tab.
        let is_heading = {
            let hash_count = trimmed.chars().take_while(|&c| c == '#').count();
            if hash_count >= 1 && hash_count <= 6 {
                let rest = &trimmed[hash_count..];
                rest.starts_with(' ') || rest.starts_with('\t') || rest.is_empty()
            } else {
                false
            }
        };

        if is_heading {
            continue;
        }

        // Processar caracteres da linha
        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        let mut in_inline_code = false;
        let mut i = 0;

        while i < len {
            let c = chars[i];

            if c == '`' {
                in_inline_code = !in_inline_code;
                i += 1;
                continue;
            }

            if !in_inline_code && c == '#' {
                // Verificar limite anterior: deve ser início de linha, espaço ou pontuação comum
                let valid_prefix = if i == 0 {
                    true
                } else {
                    let prev = chars[i - 1];
                    prev.is_whitespace() || prev == '(' || prev == '[' || prev == '{' || prev == '"' || prev == '\''
                };

                if valid_prefix && i + 1 < len {
                    let next_char = chars[i + 1];
                    // O primeiro caractere após # deve ser alfanumérico ou underscore
                    if next_char.is_alphanumeric() || next_char == '_' {
                        let mut j = i + 1;
                        while j < len {
                            let curr = chars[j];
                            if curr.is_alphanumeric() || curr == '_' || curr == '-' || curr == '/' {
                                j += 1;
                            } else {
                                break;
                            }
                        }

                        let tag_str: String = chars[i + 1..j].iter().collect();
                        // Remover pontuação terminal acidental como hífens no final
                        let clean_tag = tag_str.trim_end_matches('-').trim_end_matches('/');

                        if !clean_tag.is_empty() && seen.insert(clean_tag.to_string()) {
                            tags.push(clean_tag.to_string());
                        }

                        i = j;
                        continue;
                    }
                }
            }

            i += 1;
        }
    }

    tags
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_tag() {
        let result = parse_tags("Texto com #rust aqui");
        assert!(result.contains(&"rust".to_string()));
    }

    #[test]
    fn test_heading_not_tag() {
        let result = parse_tags("## Título do documento");
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_tag_in_code_block_ignored() {
        let result = parse_tags("```\n#nao-e-tag\n```");
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_multiple_tags() {
        let result = parse_tags("Post sobre #rust e #markdown");
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"rust".to_string()));
        assert!(result.contains(&"markdown".to_string()));
    }

    #[test]
    fn test_tag_with_hyphen() {
        let result = parse_tags("Tópico #local-first");
        assert!(result.contains(&"local-first".to_string()));
    }

    #[test]
    fn test_tag_in_inline_code_ignored() {
        let result = parse_tags("Exemplo `#codigo` e fora #valida");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], "valida");
    }

    #[test]
    fn test_tag_inside_parentheses() {
        let result = parse_tags("Categorias: (#produtividade, #design)");
        assert_eq!(result.len(), 2);
        assert!(result.contains(&"produtividade".to_string()));
        assert!(result.contains(&"design".to_string()));
    }
}
