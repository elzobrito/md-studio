use std::collections::HashMap;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::index::document_metadata::DocumentMetadata;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MetadataIndex {
    pub documents: HashMap<PathBuf, DocumentMetadata>,
    pub version: u32,
    pub indexed_at: u64, // Unix timestamp
}

impl Default for MetadataIndex {
    fn default() -> Self {
        Self::new()
    }
}

impl MetadataIndex {
    pub fn new() -> Self {
        Self {
            documents: HashMap::new(),
            version: 1,
            indexed_at: 0,
        }
    }

    pub fn insert(&mut self, doc: DocumentMetadata) {
        self.documents.insert(doc.path.clone(), doc);
    }

    pub fn remove(&mut self, path: &PathBuf) -> Option<DocumentMetadata> {
        self.documents.remove(path)
    }

    pub fn get(&self, path: &PathBuf) -> Option<&DocumentMetadata> {
        self.documents.get(path)
    }

    pub fn all(&self) -> Vec<&DocumentMetadata> {
        self.documents.values().collect()
    }

    pub fn len(&self) -> usize {
        self.documents.len()
    }

    pub fn is_empty(&self) -> bool {
        self.documents.is_empty()
    }

    pub fn contains(&self, path: &PathBuf) -> bool {
        self.documents.contains_key(path)
    }

    pub fn paths(&self) -> Vec<&PathBuf> {
        self.documents.keys().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_doc(path: &str) -> DocumentMetadata {
        DocumentMetadata {
            path: PathBuf::from(path),
            title: Some(path.to_string()),
            headings: vec![],
            links: vec![],
            wiki_links: vec![],
            tags: vec!["tag".to_string()],
            images: vec![],
            tables: 0,
            mermaid_blocks: 0,
            katex_blocks: 0,
            word_count: 50,
            line_count: 10,
            last_modified: 1000,
        }
    }

    #[test]
    fn test_metadata_index_operations() {
        let mut index = MetadataIndex::new();
        assert!(index.is_empty());
        assert_eq!(index.len(), 0);

        let p1 = PathBuf::from("a.md");
        let p2 = PathBuf::from("b.md");

        index.insert(dummy_doc("a.md"));
        index.insert(dummy_doc("b.md"));

        assert_eq!(index.len(), 2);
        assert!(!index.is_empty());
        assert!(index.contains(&p1));
        assert!(index.contains(&p2));

        let doc_a = index.get(&p1);
        assert!(doc_a.is_some());
        assert_eq!(doc_a.unwrap().title, Some("a.md".to_string()));

        let all = index.all();
        assert_eq!(all.len(), 2);

        let paths = index.paths();
        assert_eq!(paths.len(), 2);

        index.remove(&p1);
        assert_eq!(index.len(), 1);
        assert!(!index.contains(&p1));
        assert!(index.contains(&p2));
    }

    #[test]
    fn test_metadata_index_serde_roundtrip() {
        let mut index = MetadataIndex::new();
        index.indexed_at = 1726750123;
        index.insert(dummy_doc("hello.md"));

        let json = serde_json::to_string(&index).expect("serialize");
        assert!(json.contains("\"indexedAt\":1726750123"));

        let deserialized: MetadataIndex = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized, index);
    }
}
