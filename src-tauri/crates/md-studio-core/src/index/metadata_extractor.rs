use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use crate::index::document_metadata::{DocumentMetadata, Heading, Link};
use crate::parser::{parse_tags, parse_wiki_links};

fn normalize_char(c: char) -> char {
    match c {
        'á' | 'à' | 'ã' | 'â' | 'ä' | 'Á' | 'À' | 'Ã' | 'Â' | 'Ä' => 'a',
        'é' | 'è' | 'ê' | 'ë' | 'É' | 'È' | 'Ê' | 'Ë' => 'e',
        'í' | 'ì' | 'î' | 'ï' | 'Í' | 'Ì' | 'Î' | 'Ï' => 'i',
        'ó' | 'ò' | 'õ' | 'ô' | 'ö' | 'Ó' | 'Ò' | 'Õ' | 'Ô' | 'Ö' => 'o',
        'ú' | 'ù' | 'û' | 'ü' | 'Ú' | 'Ù' | 'Û' | 'Ü' => 'u',
        'ç' | 'Ç' => 'c',
        'ñ' | 'Ñ' => 'n',
        _ => c.to_ascii_lowercase(),
    }
}

/// Cria um slug anchor a partir do texto do cabeçalho.
pub fn slugify(text: &str) -> String {
    let mut slug = String::new();
    let mut prev_dash = false;

    for c in text.chars() {
        let norm = normalize_char(c);
        if norm.is_ascii_alphanumeric() {
            slug.push(norm);
            prev_dash = false;
        } else if (norm == ' ' || norm == '-' || norm == '_') && !prev_dash && !slug.is_empty() {
            slug.push('-');
            prev_dash = true;
        }
    }

    if slug.ends_with('-') {
        slug.pop();
    }

    slug
}

/// Extrai metadados lendo o arquivo em disco.
pub fn extract_metadata(path: &Path) -> Result<DocumentMetadata, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mtime = fs::metadata(path)
        .and_then(|m| m.modified())
        .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
        .unwrap_or(0);

    Ok(extract_metadata_from_str(path, &content, mtime))
}

/// Extrai metadados diretamente de uma string de conteúdo.
pub fn extract_metadata_from_str(path: &Path, content: &str, mtime: u64) -> DocumentMetadata {
    let mut title: Option<String> = None;
    let mut headings = Vec::new();
    let mut links = Vec::new();
    let mut images = Vec::new();
    let mut tables = 0;
    let mut mermaid_blocks = 0;
    let mut katex_blocks = 0;

    let wiki_links = parse_wiki_links(content);
    let tags = parse_tags(content);

    let mut in_code_block = false;
    let mut fence_char = '\0';
    let mut fence_len = 0;
    let mut in_frontmatter = false;
    let mut frontmatter_line_count = 0;
    let mut in_table = false;
    let mut in_math_block = false;

    for (line_idx, line) in content.lines().enumerate() {
        let line_num = line_idx + 1;
        let trimmed = line.trim();

        // 1. Checar Frontmatter YAML no topo
        if line_idx == 0 && trimmed == "---" {
            in_frontmatter = true;
            continue;
        }
        if in_frontmatter {
            if trimmed == "---" {
                in_frontmatter = false;
                continue;
            }
            frontmatter_line_count += 1;
            if frontmatter_line_count < 30 {
                if let Some(stripped) = trimmed.strip_prefix("title:") {
                    let val = stripped.trim().trim_matches('"').trim_matches('\'').trim();
                    if !val.is_empty() && title.is_none() {
                        title = Some(val.to_string());
                    }
                }
            }
            continue;
        }

        // 2. Checar Fences de código
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            let ch = trimmed.chars().next().unwrap_or('`');
            let count = trimmed.chars().take_while(|&c| c == ch).count();
            if !in_code_block {
                in_code_block = true;
                fence_char = ch;
                fence_len = count;

                let info = trimmed[count..].trim();
                if info.eq_ignore_ascii_case("mermaid") {
                    mermaid_blocks += 1;
                } else if info.eq_ignore_ascii_case("math") || info.eq_ignore_ascii_case("katex") {
                    katex_blocks += 1;
                }
                continue;
            } else if ch == fence_char && count >= fence_len {
                in_code_block = false;
                continue;
            }
        }

        if in_code_block {
            continue;
        }

        // 3. Checar blocos matemáticos delimitados por $$
        if trimmed.starts_with("$$") {
            if !in_math_block {
                katex_blocks += 1;
                if trimmed.len() > 2 && trimmed.ends_with("$$") {
                    // Bloco de uma linha só $$ ... $$
                } else {
                    in_math_block = true;
                }
            } else {
                in_math_block = false;
            }
            continue;
        }
        if in_math_block {
            continue;
        }

        // 4. Detecção de Headings
        let hash_count = trimmed.chars().take_while(|&c| c == '#').count();
        if hash_count >= 1 && hash_count <= 6 {
            let rest = &trimmed[hash_count..];
            if rest.starts_with(' ') || rest.starts_with('\t') {
                let text = rest.trim();
                if !text.is_empty() {
                    let anchor = slugify(text);
                    if title.is_none() && hash_count == 1 {
                        title = Some(text.to_string());
                    }
                    headings.push(Heading {
                        depth: hash_count as u8,
                        text: text.to_string(),
                        anchor,
                    });
                }
            }
        }

        // 5. Detecção de Tabelas Markdown
        if trimmed.starts_with('|') && trimmed.contains('|') {
            if !in_table {
                in_table = true;
                tables += 1;
            }
        } else if in_table && !trimmed.is_empty() {
            // Continua na tabela
        } else {
            in_table = false;
        }

        // 6. Detecção de Imagens e Links Markdown: ![Alt](url) ou [Text](url)
        let chars: Vec<char> = line.chars().collect();
        let len = chars.len();
        let mut i = 0;
        let mut in_inline_code = false;

        while i < len {
            let c = chars[i];
            if c == '`' {
                in_inline_code = !in_inline_code;
                i += 1;
                continue;
            }
            if in_inline_code {
                i += 1;
                continue;
            }

            // Checar Imagem: ![alt](url)
            if c == '!' && i + 1 < len && chars[i + 1] == '[' {
                if let Some((_, url, end)) = extract_bracket_paren(&chars, i + 1) {
                    if !url.is_empty() {
                        images.push(url);
                    }
                    i = end;
                    continue;
                }
            }

            // Checar Link: [text](url)
            if c == '[' && (i == 0 || chars[i - 1] != '!') {
                // Certificar que não é [[wiki link]]
                if i + 1 < len && chars[i + 1] != '[' {
                    if let Some((text, url, end)) = extract_bracket_paren(&chars, i) {
                        let is_internal = !url.starts_with("http://")
                            && !url.starts_with("https://")
                            && !url.starts_with("mailto:")
                            && !url.starts_with("ftp://");

                        links.push(Link {
                            text,
                            url,
                            is_internal,
                            line: line_num,
                        });
                        i = end;
                        continue;
                    }
                }
            }

            i += 1;
        }
    }

    // Se nenhum título foi encontrado, usar o nome base do arquivo
    if title.is_none() {
        if let Some(stem) = path.file_stem() {
            let s = stem.to_string_lossy().to_string();
            if !s.is_empty() {
                title = Some(s);
            }
        }
    }

    let word_count = content
        .split_whitespace()
        .filter(|w| !w.is_empty())
        .count();

    let line_count = content.lines().count();

    DocumentMetadata {
        path: path.to_path_buf(),
        title,
        headings,
        links,
        wiki_links,
        tags,
        images,
        tables,
        mermaid_blocks,
        katex_blocks,
        word_count,
        line_count,
        last_modified: mtime,
    }
}

/// Extrai pares [text](url) a partir da posição inicial do '['
fn extract_bracket_paren(chars: &[char], start: usize) -> Option<(String, String, usize)> {
    let len = chars.len();
    let mut bracket_end = None;
    let mut j = start + 1;

    while j < len {
        if chars[j] == ']' {
            bracket_end = Some(j);
            break;
        }
        if chars[j] == '[' {
            return None;
        }
        j += 1;
    }

    let b_end = bracket_end?;
    if b_end + 1 >= len || chars[b_end + 1] != '(' {
        return None;
    }

    let mut paren_end = None;
    let mut k = b_end + 2;
    while k < len {
        if chars[k] == ')' {
            paren_end = Some(k);
            break;
        }
        k += 1;
    }

    let p_end = paren_end?;
    let text: String = chars[start + 1..b_end].iter().collect();
    let url: String = chars[b_end + 2..p_end].iter().collect();

    Some((text.trim().to_string(), url.trim().to_string(), p_end + 1))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_extract_metadata_comprehensive() {
        let content = r#"---
title: "Guia de Arquitetura"
---

# Introdução

Este é um documento de teste com #rust e #arquitetura.
Veja também [[Configuracao]] e [[Plugins|Sistema de Plugins]].

Para saber mais, acesse [Site Oficial](https://example.com) ou [Docs Locais](manual.md).

Aqui está um diagrama:
```mermaid
graph TD
  A --> B
```

E uma fórmula matemática:
$$
E = mc^2
$$

| Item | Qtd |
| ---- | --- |
| A    | 10  |

![Logo](assets/logo.png)
"#;

        let path = PathBuf::from("docs/guia.md");
        let meta = extract_metadata_from_str(&path, content, 123456);

        assert_eq!(meta.title, Some("Guia de Arquitetura".to_string()));
        assert_eq!(meta.headings.len(), 1);
        assert_eq!(meta.headings[0].depth, 1);
        assert_eq!(meta.headings[0].text, "Introdução");
        assert_eq!(meta.headings[0].anchor, "introducao");

        assert_eq!(meta.tags.len(), 2);
        assert!(meta.tags.contains(&"rust".to_string()));
        assert!(meta.tags.contains(&"arquitetura".to_string()));

        assert_eq!(meta.wiki_links.len(), 2);
        assert_eq!(meta.wiki_links[0].target, "Configuracao");
        assert_eq!(meta.wiki_links[1].target, "Plugins");
        assert_eq!(meta.wiki_links[1].alias, Some("Sistema de Plugins".to_string()));

        assert_eq!(meta.links.len(), 2);
        assert!(!meta.links[0].is_internal); // https://example.com
        assert!(meta.links[1].is_internal);  // manual.md

        assert_eq!(meta.images.len(), 1);
        assert_eq!(meta.images[0], "assets/logo.png");

        assert_eq!(meta.mermaid_blocks, 1);
        assert_eq!(meta.katex_blocks, 1);
        assert_eq!(meta.tables, 1);
        assert!(meta.word_count > 20);
        assert_eq!(meta.last_modified, 123456);
    }
}
