use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentMetadata {
    pub path: PathBuf,
    pub title: Option<String>,
    pub headings: Vec<Heading>,
    pub links: Vec<Link>,
    pub wiki_links: Vec<WikiLink>,
    pub tags: Vec<String>,
    pub images: Vec<String>,
    pub tables: usize,
    pub mermaid_blocks: usize,
    pub katex_blocks: usize,
    pub word_count: usize,
    pub line_count: usize,
    pub last_modified: u64, // Unix timestamp em segundos ou ms
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Heading {
    pub depth: u8,   // 1-6
    pub text: String,
    pub anchor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    pub text: String,
    pub url: String,
    pub is_internal: bool,
    pub line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WikiLink {
    pub target: String,
    pub alias: Option<String>,
    pub line: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_metadata_serde_camel_case() {
        let meta = DocumentMetadata {
            path: PathBuf::from("docs/intro.md"),
            title: Some("Introdução".to_string()),
            headings: vec![Heading {
                depth: 1,
                text: "Introdução".to_string(),
                anchor: "introducao".to_string(),
            }],
            links: vec![Link {
                text: "Link".to_string(),
                url: "https://example.com".to_string(),
                is_internal: false,
                line: 3,
            }],
            wiki_links: vec![WikiLink {
                target: "Guia".to_string(),
                alias: Some("Meu Guia".to_string()),
                line: 5,
            }],
            tags: vec!["rust".to_string(), "tauri".to_string()],
            images: vec!["img/logo.png".to_string()],
            tables: 1,
            mermaid_blocks: 2,
            katex_blocks: 0,
            word_count: 120,
            line_count: 25,
            last_modified: 1726750000,
        };

        let json = serde_json::to_string(&meta).expect("serialize");
        assert!(json.contains("\"wikiLinks\":"));
        assert!(json.contains("\"wordCount\":"));
        assert!(json.contains("\"lastModified\":"));
        assert!(json.contains("\"mermaidBlocks\":"));
        assert!(json.contains("\"katexBlocks\":"));

        let deserialized: DocumentMetadata = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized, meta);
    }
}
