use std::collections::HashMap;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::index::DocumentMetadata;
use crate::persistence::atomic_write_bytes;
use crate::workspace::resolve_within;

#[derive(Debug, Error)]
pub enum AssetError {
    #[error("Path fence violation: {0}")]
    PathFenceViolation(String),
    #[error("Destination must be located inside assets/ directory: {0}")]
    InvalidAssetDirectory(String),
    #[error("File already exists: {0}. Silent overwrite is prohibited.")]
    DestinationCollision(String),
    #[error("Empty or invalid image payload")]
    InvalidPayload,
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AssetRecord {
    pub path: String,
    pub sha256: String,
    pub byte_size: u64,
    pub referenced_by: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AssetDiagnosticKind {
    Missing,
    Orphan,
    Duplicate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AssetDiagnostic {
    pub kind: AssetDiagnosticKind,
    pub asset_path: String,
    pub message: String,
    pub related_paths: Vec<String>,
}

pub fn calculate_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// Salva uma imagem colada dentro do workspace sob assets/ de maneira segura e atômica.
/// Proíbe sobrescrita silenciosa e valida estritamente a fronteira (path fence).
pub fn save_pasted_asset(
    workspace_root: &Path,
    relative_path: &str,
    data: &[u8],
    allow_overwrite: bool,
) -> Result<AssetRecord, AssetError> {
    if data.is_empty() {
        return Err(AssetError::InvalidPayload);
    }

    let normalized = relative_path.replace('\\', "/");
    let trimmed = normalized.trim_start_matches('/');

    // 1. Proibir escape de path traversal
    if trimmed.contains("../") || trimmed.contains("/..") {
        return Err(AssetError::PathFenceViolation(format!(
            "Path traversal rejected: {}",
            relative_path
        )));
    }

    // 2. Garantir que o destino está em assets/
    if !trimmed.starts_with("assets/") && trimmed != "assets" {
        return Err(AssetError::InvalidAssetDirectory(format!(
            "Destination must be inside assets/: {}",
            relative_path
        )));
    }

    // 3. Resolver com fronteira de segurança no workspace
    let absolute_path = resolve_within(workspace_root, trimmed).map_err(|e| {
        AssetError::PathFenceViolation(format!("Fence violation: {:?}", e))
    })?;

    // 4. Detecção de colisão: Proibida sobrescrita silenciosa
    if absolute_path.exists() && !allow_overwrite {
        return Err(AssetError::DestinationCollision(trimmed.to_string()));
    }

    // 5. Escrita atômica do arquivo
    atomic_write_bytes(&absolute_path, data)?;

    let sha256 = calculate_sha256(data);
    let byte_size = data.len() as u64;

    Ok(AssetRecord {
        path: trimmed.to_string(),
        sha256,
        byte_size,
        referenced_by: Vec::new(),
    })
}

/// Analisa todos os assets do workspace contra os metadados dos documentos Markdown.
/// Detecta:
/// - Assets ausentes (referenciados mas inexistentes no disco)
/// - Assets órfãos (presentes em assets/ mas não referenciados por nenhum documento)
/// - Duplicatas por hash SHA-256
pub fn analyze_assets(
    workspace_root: &Path,
    documents: &[DocumentMetadata],
) -> Result<(Vec<AssetRecord>, Vec<AssetDiagnostic>), std::io::Error> {
    let assets_dir = workspace_root.join("assets");
    let mut disk_assets: HashMap<String, (String, u64)> = HashMap::new(); // rel_path -> (sha256, size)

    if assets_dir.exists() && assets_dir.is_dir() {
        scan_assets_dir(&assets_dir, workspace_root, &mut disk_assets)?;
    }

    // Mapear referências de imagens a partir dos documentos Markdown
    let mut image_references: HashMap<String, Vec<String>> = HashMap::new(); // asset_path -> list of doc paths
    for doc in documents {
        let doc_path = doc.path.to_string_lossy().replace('\\', "/");
        for img in &doc.images {
            let norm_img = img.replace('\\', "/");
            // Se for caminho relativo ou em assets/
            if !norm_img.starts_with("http://")
                && !norm_img.starts_with("https://")
                && !norm_img.starts_with("data:")
            {
                let clean_img = norm_img.trim_start_matches("./").to_string();
                image_references
                    .entry(clean_img)
                    .or_default()
                    .push(doc_path.clone());
            }
        }
    }

    let mut records = Vec::new();
    let mut diagnostics = Vec::new();
    let mut sha_to_paths: HashMap<String, Vec<String>> = HashMap::new();

    // 1. Processar arquivos presentes no disco
    for (rel_path, (sha, size)) in &disk_assets {
        let refs = image_references.get(rel_path).cloned().unwrap_or_default();
        sha_to_paths
            .entry(sha.clone())
            .or_default()
            .push(rel_path.clone());

        records.push(AssetRecord {
            path: rel_path.clone(),
            sha256: sha.clone(),
            byte_size: *size,
            referenced_by: refs.clone(),
        });

        // Checar se é órfão
        if refs.is_empty() {
            diagnostics.push(AssetDiagnostic {
                kind: AssetDiagnosticKind::Orphan,
                asset_path: rel_path.clone(),
                message: format!("Asset '{}' is not referenced by any markdown document", rel_path),
                related_paths: Vec::new(),
            });
        }
    }

    // 2. Processar referências a assets ausentes
    for (referenced_path, docs) in &image_references {
        if !disk_assets.contains_key(referenced_path) {
            let full_check = workspace_root.join(referenced_path);
            if !full_check.exists() {
                diagnostics.push(AssetDiagnostic {
                    kind: AssetDiagnosticKind::Missing,
                    asset_path: referenced_path.clone(),
                    message: format!(
                        "Asset '{}' referenced by {} document(s) does not exist on disk",
                        referenced_path,
                        docs.len()
                    ),
                    related_paths: docs.clone(),
                });
            }
        }
    }

    // 3. Processar duplicatas por SHA-256
    for (sha, paths) in sha_to_paths {
        if paths.len() > 1 {
            for p in &paths {
                let others: Vec<String> = paths.iter().filter(|x| *x != p).cloned().collect();
                diagnostics.push(AssetDiagnostic {
                    kind: AssetDiagnosticKind::Duplicate,
                    asset_path: p.clone(),
                    message: format!(
                        "Asset '{}' shares identical SHA-256 ({}) with {}",
                        p,
                        &sha[..8],
                        others.join(", ")
                    ),
                    related_paths: others,
                });
            }
        }
    }

    records.sort_by(|a, b| a.path.cmp(&b.path));
    diagnostics.sort_by(|a, b| a.asset_path.cmp(&b.asset_path));

    Ok((records, diagnostics))
}

fn scan_assets_dir(
    dir: &Path,
    root: &Path,
    results: &mut HashMap<String, (String, u64)>,
) -> Result<(), std::io::Error> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let p = entry.path();
        if p.is_dir() {
            scan_assets_dir(&p, root, results)?;
        } else if p.is_file() {
            if let Ok(bytes) = fs::read(&p) {
                let sha = calculate_sha256(&bytes);
                let size = bytes.len() as u64;
                if let Ok(rel) = p.strip_prefix(root) {
                    let rel_str = rel.to_string_lossy().replace('\\', "/");
                    results.insert(rel_str, (sha, size));
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::tempdir;

    #[test]
    fn test_save_pasted_asset_creates_file_in_assets() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        let data = b"fake-png-content";

        let record = save_pasted_asset(root, "assets/img1.png", data, false).unwrap();
        assert_eq!(record.path, "assets/img1.png");
        assert_eq!(record.byte_size, data.len() as u64);
        assert!(!record.sha256.is_empty());
        assert!(root.join("assets/img1.png").exists());
    }

    #[test]
    fn test_save_pasted_asset_collision_detection() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        let data = b"initial-data";

        save_pasted_asset(root, "assets/photo.png", data, false).unwrap();

        // Tentativa de salvar com mesmo nome sem allow_overwrite deve colidir
        let err = save_pasted_asset(root, "assets/photo.png", b"new-data", false).unwrap_err();
        match err {
            AssetError::DestinationCollision(p) => assert_eq!(p, "assets/photo.png"),
            other => panic!("Expected DestinationCollision, got {:?}", other),
        }
    }

    #[test]
    fn test_save_pasted_asset_fence_rejection() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        let data = b"malicious";

        // Tentativa de escapar via ..
        let err = save_pasted_asset(root, "assets/../../etc/passwd", data, false).unwrap_err();
        assert!(matches!(err, AssetError::PathFenceViolation(_)));

        // Tentativa de salvar fora de assets/
        let err2 = save_pasted_asset(root, "src/hack.png", data, false).unwrap_err();
        assert!(matches!(err2, AssetError::InvalidAssetDirectory(_)));
    }

    #[test]
    fn test_analyze_assets_detects_orphan_missing_and_duplicates() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        let assets_dir = root.join("assets");
        fs::create_dir_all(&assets_dir).unwrap();

        // 1. Criar dois arquivos com mesmo conteúdo (duplicatas)
        let dup_content = b"identical-image-content";
        fs::write(assets_dir.join("dup1.png"), dup_content).unwrap();
        fs::write(assets_dir.join("dup2.png"), dup_content).unwrap();

        // 2. Criar um arquivo órfão
        fs::write(assets_dir.join("orphan.png"), b"orphan-data").unwrap();

        // 3. Documento referenciando dup1.png e missing.png
        let doc_meta = DocumentMetadata {
            path: PathBuf::from("note.md"),
            title: Some("Note".to_string()),
            headings: vec![],
            links: vec![],
            wiki_links: vec![],
            tags: vec![],
            images: vec!["assets/dup1.png".to_string(), "assets/missing.png".to_string()],
            tables: 0,
            mermaid_blocks: 0,
            katex_blocks: 0,
            word_count: 10,
            line_count: 5,
            last_modified: 1000,
        };

        let (records, diagnostics) = analyze_assets(root, &[doc_meta]).unwrap();

        assert_eq!(records.len(), 3); // dup1, dup2, orphan

        let has_orphan = diagnostics.iter().any(|d| d.kind == AssetDiagnosticKind::Orphan && d.asset_path == "assets/orphan.png");
        let has_missing = diagnostics.iter().any(|d| d.kind == AssetDiagnosticKind::Missing && d.asset_path == "assets/missing.png");
        let has_dup = diagnostics.iter().any(|d| d.kind == AssetDiagnosticKind::Duplicate);

        assert!(has_orphan, "Orphan asset must be detected");
        assert!(has_missing, "Missing asset must be detected");
        assert!(has_dup, "Duplicate asset must be detected");
    }
}
