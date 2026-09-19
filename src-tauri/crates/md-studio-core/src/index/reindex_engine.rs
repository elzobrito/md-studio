use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};

use crate::index::metadata_extractor::extract_metadata;
use crate::index::metadata_index::MetadataIndex;
use crate::index::workspace_scanner::WorkspaceScanner;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReindexReport {
    pub indexed: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

#[derive(Clone)]
pub struct ReindexEngine {
    pub index: Arc<Mutex<MetadataIndex>>,
    pub root: PathBuf,
}

impl ReindexEngine {
    pub fn new(root: PathBuf) -> Self {
        Self {
            index: Arc::new(Mutex::new(MetadataIndex::new())),
            root,
        }
    }

    pub fn with_index(root: PathBuf, index: Arc<Mutex<MetadataIndex>>) -> Self {
        Self { index, root }
    }

    /// Executa uma varredura e reindexação completa do workspace.
    pub fn full_reindex(&self) -> Result<ReindexReport, String> {
        let scanner = WorkspaceScanner::new(self.root.clone());
        let docs = scanner.scan()?;

        let mut index = self.index.lock().map_err(|e| e.to_string())?;
        *index = MetadataIndex::new();

        let mut report = ReindexReport {
            indexed: 0,
            skipped: 0,
            errors: Vec::new(),
        };

        for doc in docs {
            index.insert(doc);
            report.indexed += 1;
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        index.indexed_at = now;

        Ok(report)
    }

    /// Reindexa um único arquivo de forma incremental (após salvar ou modificação externa).
    pub fn reindex_file(&self, path: &Path) -> Result<(), String> {
        let abs_path = if path.is_absolute() {
            path.to_path_buf()
        } else {
            self.root.join(path)
        };

        // Caminho relativo para armazenamento consistente no índice
        let rel_path = if abs_path.starts_with(&self.root) {
            abs_path
                .strip_prefix(&self.root)
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|_| path.to_path_buf())
        } else {
            path.to_path_buf()
        };

        if !abs_path.exists() {
            return Err(format!("Arquivo não existe: {}", abs_path.display()));
        }

        let mut metadata = extract_metadata(&abs_path)?;
        metadata.path = rel_path;

        let mut index = self.index.lock().map_err(|e| e.to_string())?;
        index.insert(metadata);

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        index.indexed_at = now;

        Ok(())
    }

    /// Remove um arquivo do índice (caso tenha sido removido externamente).
    pub fn remove_file(&self, path: &Path) -> Result<bool, String> {
        let rel_path = if path.is_absolute() && path.starts_with(&self.root) {
            path.strip_prefix(&self.root)
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|_| path.to_path_buf())
        } else {
            path.to_path_buf()
        };

        let mut index = self.index.lock().map_err(|e| e.to_string())?;
        let removed = index.remove(&rel_path).is_some();
        Ok(removed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_reindex_engine_workflow() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();

        // 1. Criar arquivos iniciais
        fs::write(root.join("doc1.md"), "# Documento 1\nTag: #onda1").expect("write");
        fs::write(root.join("doc2.md"), "# Documento 2\nVeja [[doc1]]").expect("write");

        let engine = ReindexEngine::new(root.to_path_buf());

        // 2. Full reindex
        let report = engine.full_reindex().expect("full_reindex");
        assert_eq!(report.indexed, 2);
        assert_eq!(report.errors.len(), 0);

        {
            let index = engine.index.lock().unwrap();
            assert_eq!(index.len(), 2);
            assert!(index.contains(&PathBuf::from("doc1.md")));
            assert!(index.contains(&PathBuf::from("doc2.md")));
        }

        // 3. Modificar/Adicionar novo arquivo incrementalmente
        fs::write(root.join("doc3.md"), "# Documento 3\n#rust").expect("write");
        engine.reindex_file(&PathBuf::from("doc3.md")).expect("reindex doc3");

        {
            let index = engine.index.lock().unwrap();
            assert_eq!(index.len(), 3);
            let d3 = index.get(&PathBuf::from("doc3.md")).expect("doc3");
            assert_eq!(d3.title, Some("Documento 3".to_string()));
            assert!(d3.tags.contains(&"rust".to_string()));
        }

        // 4. Remover arquivo do índice
        let removed = engine.remove_file(&PathBuf::from("doc2.md")).expect("remove");
        assert!(removed);

        {
            let index = engine.index.lock().unwrap();
            assert_eq!(index.len(), 2);
            assert!(!index.contains(&PathBuf::from("doc2.md")));
        }
    }
}
