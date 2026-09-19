use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};

use crate::index::backlink_index::{BacklinkIndex, BacklinkResult};
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
    pub backlinks: Arc<Mutex<BacklinkIndex>>,
    pub root: PathBuf,
}

impl ReindexEngine {
    pub fn new(root: PathBuf) -> Self {
        Self {
            index: Arc::new(Mutex::new(MetadataIndex::new())),
            backlinks: Arc::new(Mutex::new(BacklinkIndex::new())),
            root,
        }
    }

    pub fn with_index(root: PathBuf, index: Arc<Mutex<MetadataIndex>>) -> Self {
        Self {
            index,
            backlinks: Arc::new(Mutex::new(BacklinkIndex::new())),
            root,
        }
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
        self.rebuild_backlinks_locked(&index);

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
        metadata.path = rel_path.clone();

        let mut index = self.index.lock().map_err(|e| e.to_string())?;
        index.insert(metadata);

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        index.indexed_at = now;
        // replace_source of this file, then rebuild so other sources re-resolve
        // (e.g. a newly created target turns previous Unresolved links into Resolved).
        self.replace_backlinks_source_locked(&rel_path, &index);
        self.rebuild_backlinks_locked(&index);

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
        if removed {
            self.remove_backlinks_source_locked(&rel_path);
            self.rebuild_backlinks_locked(&index);
        }
        Ok(removed)
    }

    /// Rebuild the reverse index from the current metadata snapshot.
    /// Used after loading a persisted MetadataIndex (backlinks are never persisted).
    pub fn rebuild_backlinks(&self) {
        match self.index.lock() {
            Ok(index) => self.rebuild_backlinks_locked(&index),
            Err(err) => eprintln!("backlink rebuild skipped: {err}"),
        }
    }

    pub fn backlinks_for(&self, target: &Path) -> Result<BacklinkResult, String> {
        let index = self.index.lock().map_err(|e| e.to_string())?;
        let backlinks = self.backlinks.lock().map_err(|e| e.to_string())?;
        Ok(backlinks.backlinks_for(target, &index))
    }

    /// Apply a filesystem watch event to the existing metadata + backlink indexes.
    /// Does not spawn a watcher; callers reuse the single notify hub.
    pub fn apply_external_change(&self, kind: &str, relative_path: &Path, from: Option<&Path>) {
        match kind {
            "removed" => {
                let _ = self.remove_file(relative_path);
            }
            "renamed" => {
                if let Some(from) = from {
                    let _ = self.remove_file(from);
                }
                if is_markdown(relative_path) {
                    let _ = self.reindex_file(relative_path);
                }
            }
            _ => {
                if is_markdown(relative_path) {
                    let _ = self.reindex_file(relative_path);
                }
            }
        }
    }

    fn rebuild_backlinks_locked(&self, index: &MetadataIndex) {
        match self.backlinks.lock() {
            Ok(mut backlinks) => backlinks.rebuild(index),
            Err(err) => eprintln!("backlink rebuild failed: {err}"),
        }
    }

    fn replace_backlinks_source_locked(&self, source: &Path, index: &MetadataIndex) {
        match self.backlinks.lock() {
            Ok(mut backlinks) => backlinks.replace_source(source, index),
            Err(err) => eprintln!(
                "backlink replace_source skipped for {}: {err}",
                source.display()
            ),
        }
    }

    fn remove_backlinks_source_locked(&self, source: &Path) {
        match self.backlinks.lock() {
            Ok(mut backlinks) => backlinks.remove_source(source),
            Err(err) => eprintln!(
                "backlink remove_source skipped for {}: {err}",
                source.display()
            ),
        }
    }
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("md"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn write(root: &Path, name: &str, body: &str) {
        if let Some(parent) = root.join(name).parent() {
            let _ = fs::create_dir_all(parent);
        }
        fs::write(root.join(name), body).expect("write");
    }

    fn counts(engine: &ReindexEngine, target: &str) -> (usize, usize) {
        let result = engine.backlinks_for(Path::new(target)).expect("backlinks");
        (result.document_count, result.occurrence_count)
    }

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

    #[test]
    fn add_and_remove_link_via_reindex_file_updates_backlinks() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();
        write(root, "a.md", "# A\n");
        write(root, "src.md", "# Src\n");
        let engine = ReindexEngine::new(root.to_path_buf());
        engine.full_reindex().expect("full");
        assert_eq!(counts(&engine, "a.md"), (0, 0));

        write(root, "src.md", "# Src\nSee [[a]]\nAlso [[a]]\n");
        engine.reindex_file(Path::new("src.md")).expect("add links");
        assert_eq!(counts(&engine, "a.md"), (1, 2));

        write(root, "src.md", "# Src\n");
        engine.reindex_file(Path::new("src.md")).expect("remove links");
        assert_eq!(counts(&engine, "a.md"), (0, 0));
    }

    #[test]
    fn retarget_a_to_b_and_multi_save_does_not_duplicate() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();
        write(root, "a.md", "# A\n");
        write(root, "b.md", "# B\n");
        write(root, "src.md", "[[a]]\n");
        let engine = ReindexEngine::new(root.to_path_buf());
        engine.full_reindex().expect("full");
        assert_eq!(counts(&engine, "a.md"), (1, 1));

        write(root, "src.md", "[[b]]\n");
        engine.reindex_file(Path::new("src.md")).expect("retarget");
        engine.reindex_file(Path::new("src.md")).expect("retarget again");
        engine.reindex_file(Path::new("src.md")).expect("retarget again");
        assert_eq!(counts(&engine, "a.md"), (0, 0));
        assert_eq!(counts(&engine, "b.md"), (1, 1));
    }

    #[test]
    fn creating_unresolved_target_then_reindex_establishes_relation() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();
        write(root, "src.md", "[[nova-nota]]\n");
        let engine = ReindexEngine::new(root.to_path_buf());
        engine.full_reindex().expect("full");
        assert_eq!(counts(&engine, "nova-nota.md"), (0, 0));

        write(root, "nova-nota.md", "# Nova nota\n");
        engine.reindex_file(Path::new("nova-nota.md")).expect("create target");
        assert_eq!(counts(&engine, "nova-nota.md"), (1, 1));
    }

    #[test]
    fn external_delete_and_watch_apply_remove_backlinks() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();
        write(root, "target.md", "# Target\n");
        write(root, "gone.md", "[[target]]\n");
        let engine = ReindexEngine::new(root.to_path_buf());
        engine.full_reindex().expect("full");
        assert_eq!(counts(&engine, "target.md"), (1, 1));

        engine.apply_external_change("removed", Path::new("gone.md"), None);
        assert_eq!(counts(&engine, "target.md"), (0, 0));
    }

    #[test]
    fn rebuild_matches_incremental_and_loaded_snapshot() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();
        write(root, "a.md", "# A\n");
        write(root, "b.md", "[[a]]\n");
        write(root, "c.md", "[[a]]\n");

        let rebuilt = ReindexEngine::new(root.to_path_buf());
        rebuilt.full_reindex().expect("full");

        let incremental = ReindexEngine::new(root.to_path_buf());
        incremental.reindex_file(Path::new("a.md")).expect("a");
        incremental.reindex_file(Path::new("b.md")).expect("b");
        incremental.reindex_file(Path::new("c.md")).expect("c");

        assert_eq!(counts(&rebuilt, "a.md"), counts(&incremental, "a.md"));
        assert_eq!(counts(&rebuilt, "a.md"), (2, 2));

        let loaded = ReindexEngine::with_index(
            root.to_path_buf(),
            Arc::new(Mutex::new(rebuilt.index.lock().unwrap().clone())),
        );
        loaded.rebuild_backlinks();
        assert_eq!(counts(&loaded, "a.md"), (2, 2));
    }
}
