use crate::persistence::{atomic_save, content_hash, SaveError};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum HistoryError {
    #[error("path outside workspace fence")]
    PathFenceViolation,
    #[error("invalid hash format")]
    InvalidHash,
    #[error("hash '{0}' does not belong to manifest for document")]
    MembershipViolation(String),
    #[error("historical object corrupted: expected hash {expected}, got {actual}")]
    CorruptedObject { expected: String, actual: String },
    #[error("historical object '{0}' not found on disk")]
    ObjectNotFound(String),
    #[error("current document hash mismatch: expected {expected}, actual {actual}")]
    CurrentHashMismatch { expected: String, actual: String },
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("persistence error: {0}")]
    Save(#[from] SaveError),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub path: String,
    pub timestamp: u64,
    pub hash: String,
    pub size: u64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentHistoryManifest {
    pub schema_version: u32,
    pub path: String,
    pub entries: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistorySnapshot {
    pub entry: HistoryEntry,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRestoredSnapshot {
    pub relative_path: String,
    pub content: String,
    pub content_hash: String,
    pub timestamp_ms: u64,
}

pub struct HistoryStore;

impl HistoryStore {
    const SCHEMA_VERSION: u32 = 1;
    const MAX_ENTRIES_PER_DOC: usize = 50;

    /// Retorna a raiz de histórico `<workspace>/.mdstudio/history/v1`
    pub fn history_root(workspace_root: &Path) -> PathBuf {
        workspace_root.join(".mdstudio").join("history").join("v1")
    }

    /// Valida se o hash é estritamente 64 caracteres hexadecimais minúsculos
    pub fn is_valid_hash(hash: &str) -> bool {
        hash.len() == 64 && hash.chars().all(|c| c.is_ascii_hexdigit())
    }

    /// Normaliza o caminho relativo workspace-safe e rejeita travessias com `..` ou barras absolutas
    pub fn normalize_rel_path(rel_path: &str) -> Result<String, HistoryError> {
        let norm = rel_path.replace('\\', "/").trim().to_string();
        if norm.is_empty()
            || norm.starts_with('/')
            || norm.starts_with("../")
            || norm.contains("/../")
            || norm == ".."
            || norm.contains(':')
        {
            return Err(HistoryError::PathFenceViolation);
        }
        Ok(norm)
    }

    /// Calcula a chave do documento: SHA-256 do relativePath normalizado
    pub fn doc_key(rel_path: &str) -> String {
        content_hash(rel_path.as_bytes())
    }

    fn objects_dir(history_root: &Path) -> PathBuf {
        history_root.join("objects")
    }

    fn documents_dir(history_root: &Path) -> PathBuf {
        history_root.join("documents")
    }

    fn write_atomic(target: &Path, bytes: &[u8]) -> Result<(), std::io::Error> {
        let parent = target.parent().unwrap_or_else(|| Path::new("."));
        fs::create_dir_all(parent)?;
        let tmp = parent.join(format!(
            ".{}.tmp-{}",
            target.file_name().and_then(|s| s.to_str()).unwrap_or("obj"),
            std::process::id()
        ));
        {
            let mut f = File::create(&tmp)?;
            f.write_all(bytes)?;
            f.sync_all()?;
        }
        fs::rename(&tmp, target)?;
        Ok(())
    }

    /// Grava snapshot no object store e atualiza manifest do documento
    pub fn record_snapshot(
        workspace_root: &Path,
        rel_path: &str,
        content: &str,
        reason: &str,
        timestamp_ms: u64,
    ) -> Result<HistoryEntry, HistoryError> {
        let norm_path = Self::normalize_rel_path(rel_path)?;
        let h_root = Self::history_root(workspace_root);
        let hash = content_hash(content.as_bytes());

        // 1. Gravar object no storage imutável se não existir
        let obj_path = Self::objects_dir(&h_root).join(&hash);
        if !obj_path.exists() {
            Self::write_atomic(&obj_path, content.as_bytes())?;
        }

        // 2. Carregar ou inicializar manifest
        let key = Self::doc_key(&norm_path);
        let manifest_path = Self::documents_dir(&h_root).join(format!("{key}.json"));

        let mut manifest = if manifest_path.exists() {
            let data = fs::read_to_string(&manifest_path)?;
            serde_json::from_str::<DocumentHistoryManifest>(&data).unwrap_or_else(|_| {
                DocumentHistoryManifest {
                    schema_version: Self::SCHEMA_VERSION,
                    path: norm_path.clone(),
                    entries: vec![],
                }
            })
        } else {
            DocumentHistoryManifest {
                schema_version: Self::SCHEMA_VERSION,
                path: norm_path.clone(),
                entries: vec![],
            }
        };

        // Deduplicação semântica: se a entrada mais recente já tem o mesmo hash e reason, não duplica
        if let Some(first) = manifest.entries.first() {
            if first.hash == hash && first.reason == reason {
                return Ok(first.clone());
            }
        }

        let entry = HistoryEntry {
            path: norm_path,
            timestamp: timestamp_ms,
            hash,
            size: content.as_bytes().len() as u64,
            reason: reason.to_string(),
        };

        manifest.entries.insert(0, entry.clone());
        if manifest.entries.len() > Self::MAX_ENTRIES_PER_DOC {
            manifest.entries.truncate(Self::MAX_ENTRIES_PER_DOC);
        }

        let manifest_json = serde_json::to_string_pretty(&manifest)?;
        Self::write_atomic(&manifest_path, manifest_json.as_bytes())?;

        Ok(entry)
    }

    /// Lista entradas históricas do documento (mais recentes primeiro)
    pub fn list_entries(
        workspace_root: &Path,
        rel_path: &str,
    ) -> Result<Vec<HistoryEntry>, HistoryError> {
        let norm_path = Self::normalize_rel_path(rel_path)?;
        let h_root = Self::history_root(workspace_root);
        let key = Self::doc_key(&norm_path);
        let manifest_path = Self::documents_dir(&h_root).join(format!("{key}.json"));

        if !manifest_path.exists() {
            return Ok(vec![]);
        }

        let data = fs::read_to_string(&manifest_path)?;
        let manifest: DocumentHistoryManifest = serde_json::from_str(&data)?;
        Ok(manifest.entries)
    }

    /// Recupera o snapshot com validação estrita de membership e verificação de integridade SHA-256
    pub fn get_snapshot(
        workspace_root: &Path,
        rel_path: &str,
        hash: &str,
    ) -> Result<HistorySnapshot, HistoryError> {
        let norm_path = Self::normalize_rel_path(rel_path)?;
        if !Self::is_valid_hash(hash) {
            return Err(HistoryError::InvalidHash);
        }

        let entries = Self::list_entries(workspace_root, &norm_path)?;
        let matching_entry = entries
            .into_iter()
            .find(|e| e.hash == hash)
            .ok_or_else(|| HistoryError::MembershipViolation(hash.to_string()))?;

        let h_root = Self::history_root(workspace_root);
        let obj_path = Self::objects_dir(&h_root).join(hash);
        if !obj_path.exists() {
            return Err(HistoryError::ObjectNotFound(hash.to_string()));
        }

        let mut f = File::open(&obj_path)?;
        let mut content = String::new();
        f.read_to_string(&mut content)?;

        let actual_hash = content_hash(content.as_bytes());
        if actual_hash != hash {
            return Err(HistoryError::CorruptedObject {
                expected: hash.to_string(),
                actual: actual_hash,
            });
        }

        Ok(HistorySnapshot {
            entry: matching_entry,
            content,
        })
    }

    /// Executa o restore atômico com guard snapshot mandatório
    pub fn restore_entry(
        workspace_root: &Path,
        rel_path: &str,
        hash: &str,
        expected_current_hash: &str,
        now_ms: u64,
    ) -> Result<DocumentRestoredSnapshot, HistoryError> {
        let norm_path = Self::normalize_rel_path(rel_path)?;

        // 1. Obter e verificar snapshot alvo (membership + integridade de hash)
        let target_snapshot = Self::get_snapshot(workspace_root, &norm_path, hash)?;

        // 2. Verificar estado atual do documento no workspace
        let doc_full_path = workspace_root.join(&norm_path);
        let (current_content, current_hash) = if doc_full_path.exists() {
            let (buf, h, _) = crate::persistence::read_file(&doc_full_path)?;
            (buf, h)
        } else {
            (String::new(), String::new())
        };

        if current_hash != expected_current_hash {
            return Err(HistoryError::CurrentHashMismatch {
                expected: expected_current_hash.to_string(),
                actual: current_hash,
            });
        }

        // Se a versão atual já é igual ao snapshot desejado, é um no-op seguro
        if current_hash == hash {
            return Ok(DocumentRestoredSnapshot {
                relative_path: norm_path,
                content: target_snapshot.content,
                content_hash: hash.to_string(),
                timestamp_ms: now_ms,
            });
        }

        // 3. Guard Snapshot Obrigatório: salvar a versão atual antes de sobrescrever
        // Se a gravação do guard snapshot falhar, o restore é imediatamente abortado
        if !current_content.is_empty() {
            Self::record_snapshot(
                workspace_root,
                &norm_path,
                &current_content,
                "pre-restore",
                now_ms,
            )?;
        }

        // 4. Gravação atômica da versão restaurada
        let saved_hash = atomic_save(&doc_full_path, &current_hash, &target_snapshot.content)?;

        Ok(DocumentRestoredSnapshot {
            relative_path: norm_path,
            content: target_snapshot.content,
            content_hash: saved_hash,
            timestamp_ms: now_ms,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_record_and_list_snapshots() {
        let dir = tempdir().unwrap();
        let ws = dir.path();

        let e1 = HistoryStore::record_snapshot(
            ws,
            "docs/note.md",
            "# Version 1",
            "before-manual-save",
            1000,
        )
        .unwrap();

        let e2 = HistoryStore::record_snapshot(
            ws,
            "docs/note.md",
            "# Version 2",
            "before-manual-save",
            2000,
        )
        .unwrap();

        let entries = HistoryStore::list_entries(ws, "docs/note.md").unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].hash, e2.hash);
        assert_eq!(entries[1].hash, e1.hash);
    }

    #[test]
    fn test_membership_and_integrity_check() {
        let dir = tempdir().unwrap();
        let ws = dir.path();

        let e1 = HistoryStore::record_snapshot(
            ws,
            "docs/note.md",
            "# Secret V1",
            "before-manual-save",
            1000,
        )
        .unwrap();

        // Snapshot for a different doc
        let e2 = HistoryStore::record_snapshot(
            ws,
            "other.md",
            "# Other Note",
            "before-manual-save",
            1000,
        )
        .unwrap();

        // Requesting e1 with correct path -> OK
        let snap = HistoryStore::get_snapshot(ws, "docs/note.md", &e1.hash).unwrap();
        assert_eq!(snap.content, "# Secret V1");

        // Requesting e2 hash with note.md path -> MembershipViolation
        let err = HistoryStore::get_snapshot(ws, "docs/note.md", &e2.hash).unwrap_err();
        match err {
            HistoryError::MembershipViolation(h) => assert_eq!(h, e2.hash),
            _ => panic!("Expected MembershipViolation"),
        }
    }

    #[test]
    fn test_safe_restore_flow_with_guard_snapshot() {
        let dir = tempdir().unwrap();
        let ws = dir.path();
        let doc_path = ws.join("docs").join("spec.md");
        fs::create_dir_all(doc_path.parent().unwrap()).unwrap();

        // Write V1 to disk
        let h1 = atomic_save(&doc_path, "", "# Specification V1").unwrap();

        // Snapshot V1
        HistoryStore::record_snapshot(ws, "docs/spec.md", "# Specification V1", "before-manual-save", 1000).unwrap();

        // Write V2 to disk
        let h2 = atomic_save(&doc_path, &h1, "# Specification V2").unwrap();

        // Restore V1 over V2
        let restored = HistoryStore::restore_entry(ws, "docs/spec.md", &h1, &h2, 2000).unwrap();
        assert_eq!(restored.content, "# Specification V1");

        // Check that disk file now has V1
        let (disk_content, disk_hash, _) = crate::persistence::read_file(&doc_path).unwrap();
        assert_eq!(disk_content, "# Specification V1");
        assert_eq!(disk_hash, h1);

        // Check that pre-restore guard snapshot of V2 was added to history!
        let entries = HistoryStore::list_entries(ws, "docs/spec.md").unwrap();
        assert!(entries.iter().any(|e| e.reason == "pre-restore" && e.hash == h2));
    }

    #[test]
    fn test_restore_conflict_on_stale_hash() {
        let dir = tempdir().unwrap();
        let ws = dir.path();
        let doc_path = ws.join("file.md");
        let h1 = atomic_save(&doc_path, "", "V1").unwrap();
        HistoryStore::record_snapshot(ws, "file.md", "V1", "manual", 1000).unwrap();
        let _h2 = atomic_save(&doc_path, &h1, "V2").unwrap();

        // Attempt restore providing old expected hash h1 when current on disk is h2
        let err = HistoryStore::restore_entry(ws, "file.md", &h1, "stale_hash_value_12345", 2000).unwrap_err();
        match err {
            HistoryError::CurrentHashMismatch { .. } => (),
            _ => panic!("Expected CurrentHashMismatch"),
        }
    }

    #[test]
    fn test_path_fence_rejection() {
        let dir = tempdir().unwrap();
        let ws = dir.path();

        let err = HistoryStore::list_entries(ws, "../outside.md").unwrap_err();
        assert!(matches!(err, HistoryError::PathFenceViolation));

        let err2 = HistoryStore::record_snapshot(ws, "/etc/passwd", "root", "test", 1000).unwrap_err();
        assert!(matches!(err2, HistoryError::PathFenceViolation));
    }
}
