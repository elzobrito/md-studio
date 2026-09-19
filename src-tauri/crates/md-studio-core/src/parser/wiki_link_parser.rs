use crate::index::document_metadata::WikiLink;

/// Extrai Wiki Links no formato [[Target]] ou [[Target|Alias]] do conteúdo Markdown.
/// Ignora blocos de código com cercas (fences) e código inline (`...`).
pub fn parse_wiki_links(content: &str) -> Vec<WikiLink> {
    let mut links = Vec::new();
    let mut in_code_block = false;
    let mut fence_char = '\0';
    let mut fence_len = 0;

    for (line_idx, line) in content.lines().enumerate() {
        let line_num = line_idx + 1;
        let trimmed = line.trim_start();

        // Checar início/fim de blocos de código cercados (``` ou ~~~)
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

        // Processar a linha caractere por caractere respeitando código inline
        let mut in_inline_code = false;
        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        let mut i = 0;

        while i < len {
            let c = chars[i];

            if c == '`' {
                in_inline_code = !in_inline_code;
                i += 1;
                continue;
            }

            if !in_inline_code && c == '[' && i + 1 < len && chars[i + 1] == '[' {
                // Início potencial de [[...]]
                let start_idx = i + 2;
                let mut end_idx = None;
                let mut j = start_idx;

                while j + 1 < len {
                    if chars[j] == '`' {
                        // Não permite abrir inline code dentro de wiki link sem fechar
                        break;
                    }
                    if chars[j] == ']' && chars[j + 1] == ']' {
                        end_idx = Some(j);
                        break;
                    }
                    j += 1;
                }

                if let Some(end) = end_idx {
                    let inside: String = chars[start_idx..end].iter().collect();
                    let inside = inside.trim();

                    if !inside.is_empty() {
                        let (target, alias) = if let Some(pipe_pos) = inside.find('|') {
                            let t = inside[..pipe_pos].trim().to_string();
                            let a = inside[pipe_pos + 1..].trim().to_string();
                            let alias_opt = if a.is_empty() { None } else { Some(a) };
                            (t, alias_opt)
                        } else {
                            (inside.to_string(), None)
                        };

                        if !target.is_empty() {
                            links.push(WikiLink {
                                target,
                                alias,
                                line: line_num,
                            });
                        }
                    }

                    i = end + 2;
                    continue;
                }
            }

            i += 1;
        }
    }

    links
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_wiki_link() {
        let result = parse_wiki_links("Veja [[Documento]]");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].target, "Documento");
        assert!(result[0].alias.is_none());
        assert_eq!(result[0].line, 1);
    }

    #[test]
    fn test_wiki_link_with_alias() {
        let result = parse_wiki_links("Veja [[Documento|Meu Doc]]");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].target, "Documento");
        assert_eq!(result[0].alias, Some("Meu Doc".to_string()));
    }

    #[test]
    fn test_ignore_in_code_block() {
        let content = "```\n[[Ignorado]]\n```";
        let result = parse_wiki_links(content);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_ignore_in_inline_code() {
        let content = "Texto com `[[Ignorado]]` e fora [[Valido]]";
        let result = parse_wiki_links(content);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].target, "Valido");
    }

    #[test]
    fn test_multiple_wiki_links() {
        let result = parse_wiki_links("[[A]] e [[B]] e [[C|Alias]]");
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].target, "A");
        assert_eq!(result[1].target, "B");
        assert_eq!(result[2].target, "C");
        assert_eq!(result[2].alias, Some("Alias".to_string()));
    }

    #[test]
    fn test_empty_content() {
        let result = parse_wiki_links("");
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_multiline_line_number() {
        let content = "Linha 1\nLinha 2 [[Alvo]]\nLinha 3";
        let result = parse_wiki_links(content);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].line, 2);
    }
}
