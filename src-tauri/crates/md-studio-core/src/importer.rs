use crate::persistence::atomic_save;
use crate::workspace::resolve_within;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FidelityClass {
    High,
    Intermediate,
    BestEffort,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FidelityDescriptor {
    pub class: FidelityClass,
    pub label: String,
    pub explanation: String,
    pub format_id: String,
    pub basis: String,
}

pub fn get_fidelity_descriptor(format_id: &str) -> FidelityDescriptor {
    let fmt = format_id.to_lowercase().trim_start_matches('.').to_string();
    match fmt.as_str() {
        "html" | "htm" | "docx" | "epub" => FidelityDescriptor {
            class: FidelityClass::High,
            label: "Alta".to_string(),
            explanation: "A estrutura do documento tende a ser preservada de forma consistente em Markdown. Elementos visuais, layout e recursos não representáveis ainda podem exigir revisão.".to_string(),
            format_id: fmt,
            basis: "provider-format-metadata".to_string(),
        },
        "pptx" | "xlsx" => FidelityDescriptor {
            class: FidelityClass::Intermediate,
            label: "Intermediária".to_string(),
            explanation: "O conteúdo principal e parte da estrutura tendem a ser preservados, mas organização, tabelas, ordem ou elementos específicos podem exigir ajustes após a importação.".to_string(),
            format_id: fmt,
            basis: "provider-format-metadata".to_string(),
        },
        "pdf" => FidelityDescriptor {
            class: FidelityClass::BestEffort,
            label: "Best effort".to_string(),
            explanation: "A conversão prioriza recuperar conteúdo útil. Estrutura, ordem de leitura e elementos visuais podem variar significativamente; revise o resultado com atenção.".to_string(),
            format_id: fmt,
            basis: "provider-format-metadata".to_string(),
        },
        _ => FidelityDescriptor {
            class: FidelityClass::Unknown,
            label: "Desconhecida".to_string(),
            explanation: "Não há uma expectativa de fidelidade definida para esta combinação de formato e conversor. Revise o resultado antes de criar o Markdown.".to_string(),
            format_id: fmt,
            basis: "unknown".to_string(),
        },
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum SupportDecision {
    Supported { confidence: String },
    Unsupported,
    Unavailable { reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSourceDescriptor {
    pub source_id: String,
    pub display_name: String,
    pub extension: Option<String>,
    pub size_bytes: u64,
    pub format_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportAssetDescriptor {
    pub id: String,
    pub suggested_name: String,
    pub media_type: Option<String>,
    pub byte_length: usize,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportWarning {
    pub code: String,
    pub message: String,
    pub scope: Option<String>,
    pub asset_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub markdown: String,
    pub title: Option<String>,
    pub assets: Vec<ImportAssetDescriptor>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    pub warnings: Vec<ImportWarning>,
    pub fidelity: FidelityDescriptor,
}

#[derive(Debug, Error)]
pub enum ImportError {
    #[error("cancelled")]
    Cancelled,
    #[error("unsupported format: {0}")]
    UnsupportedFormat(String),
    #[error("provider unavailable: {0}")]
    ProviderUnavailable(String),
    #[error("source not found: {0}")]
    SourceNotFound(String),
    #[error("source is not a regular file: {0}")]
    SourceNotFile(String),
    #[error("source changed during import")]
    SourceChanged,
    #[error("source read failed: {0}")]
    SourceReadFailed(String),
    #[error("conversion failed: {0}")]
    ConversionFailed(String),
    #[error("invalid provider result: {0}")]
    InvalidProviderResult(String),
    #[error("timeout")]
    Timeout,
    #[error("outside workspace: {0}")]
    OutsideWorkspace(String),
    #[error("destination exists: {0}")]
    DestinationExists(String),
    #[error("asset conflict: {0}")]
    AssetConflict(String),
    #[error("commit failed: {0}")]
    CommitFailed(String),
    #[error("internal error: {0}")]
    Internal(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportFormatCapability {
    pub format_id: String,
    pub extensions: Vec<String>,
    pub media_types: Vec<String>,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImporterCapability {
    pub id: String,
    pub available: bool,
    pub formats: Vec<ImportFormatCapability>,
    pub runtime: String,
}

pub trait DocumentImporter: Send + Sync {
    fn id(&self) -> &str;
    fn capability(&self) -> ImporterCapability;
    fn supports(&self, source: &ImportSourceDescriptor) -> SupportDecision;
    fn convert(&self, source_path: &Path, format_hint: Option<&str>) -> Result<ImportResult, ImportError>;
}

#[derive(Default)]
pub struct ImporterRegistry {
    importers: Vec<Arc<dyn DocumentImporter>>,
}

impl ImporterRegistry {
    pub fn new() -> Self {
        Self {
            importers: Vec::new(),
        }
    }

    pub fn register(&mut self, importer: Arc<dyn DocumentImporter>) {
        self.importers.push(importer);
    }

    pub fn find_importer(&self, source: &ImportSourceDescriptor) -> Option<Arc<dyn DocumentImporter>> {
        for importer in &self.importers {
            if let SupportDecision::Supported { .. } = importer.supports(source) {
                return Some(importer.clone());
            }
        }
        None
    }

    pub fn get_capabilities(&self) -> Vec<ImporterCapability> {
        self.importers.iter().map(|imp| imp.capability()).collect()
    }
}

/**
 * Detecção de formato por magic numbers e fallback por extensão
 */
pub fn detect_format_from_bytes_and_ext(sample: &[u8], extension: Option<&str>) -> Option<String> {
    // 1. Assinatura PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    if sample.len() >= 5 && &sample[0..5] == b"%PDF-" {
        return Some("pdf".to_string());
    }

    // 2. Assinatura ZIP: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    // Usada por DOCX, PPTX, XLSX, EPUB
    if sample.len() >= 4 && &sample[0..4] == b"PK\x03\x04" {
        if let Some(ext) = extension {
            let lower = ext.to_lowercase().trim_start_matches('.').to_string();
            if matches!(lower.as_str(), "docx" | "pptx" | "xlsx" | "epub") {
                return Some(lower);
            }
        }
        // Se sem extensão identificável para container zip, retorna docx ou zip
        return Some("docx".to_string());
    }

    // 3. Assinatura HTML/XML em texto
    let sample_str = String::from_utf8_lossy(sample).trim_start().to_lowercase();
    if sample_str.starts_with("<!doctype html") || sample_str.starts_with("<html") {
        return Some("html".to_string());
    }
    if sample_str.starts_with("<?xml") {
        if let Some(ext) = extension {
            let lower = ext.to_lowercase().trim_start_matches('.').to_string();
            if lower == "html" || lower == "htm" {
                return Some("html".to_string());
            }
        }
        return Some("xml".to_string());
    }
    if sample_str.starts_with('{') || sample_str.starts_with('[') {
        return Some("json".to_string());
    }

    // 4. Fallback por extensão
    if let Some(ext) = extension {
        let clean = ext.to_lowercase().trim_start_matches('.').to_string();
        if !clean.is_empty() {
            return Some(clean);
        }
    }

    None
}

/**
 * Gravação final atômica protegida por Path Fencing (resolve_within)
 * Sem sobrescrita silenciosa se o arquivo já existir.
 */
pub fn commit_import(
    workspace_root: &Path,
    relative_markdown_path: &str,
    markdown: &str,
    overwrite: bool,
) -> Result<PathBuf, ImportError> {
    let resolved = resolve_within(workspace_root, relative_markdown_path)
        .map_err(|e| ImportError::OutsideWorkspace(e.to_string()))?;

    if resolved.exists() && !overwrite {
        return Err(ImportError::DestinationExists(format!(
            "O arquivo de destino já existe: {}",
            resolved.display()
        )));
    }

    let expected_hash = if resolved.exists() {
        let (_, hash, _) = crate::persistence::read_file(&resolved)
            .map_err(|e| ImportError::SourceReadFailed(e.to_string()))?;
        hash
    } else {
        String::new()
    };

    atomic_save(&resolved, &expected_hash, markdown)
        .map_err(|e| ImportError::CommitFailed(e.to_string()))?;

    Ok(resolved)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_fidelity_descriptors() {
        let high = get_fidelity_descriptor("docx");
        assert_eq!(high.class, FidelityClass::High);
        assert_eq!(high.label, "Alta");

        let intermediate = get_fidelity_descriptor(".pptx");
        assert_eq!(intermediate.class, FidelityClass::Intermediate);
        assert_eq!(intermediate.label, "Intermediária");

        let best_effort = get_fidelity_descriptor("PDF");
        assert_eq!(best_effort.class, FidelityClass::BestEffort);
        assert_eq!(best_effort.label, "Best effort");

        let unknown = get_fidelity_descriptor("csv");
        assert_eq!(unknown.class, FidelityClass::Unknown);
        assert_eq!(unknown.label, "Desconhecida");
    }

    #[test]
    fn test_detect_format() {
        assert_eq!(
            detect_format_from_bytes_and_ext(b"%PDF-1.7\n...", None),
            Some("pdf".to_string())
        );
        assert_eq!(
            detect_format_from_bytes_and_ext(b"PK\x03\x04...", Some(".docx")),
            Some("docx".to_string())
        );
        assert_eq!(
            detect_format_from_bytes_and_ext(b"PK\x03\x04...", Some("epub")),
            Some("epub".to_string())
        );
        assert_eq!(
            detect_format_from_bytes_and_ext(b"<!DOCTYPE html><html><body>ok</body></html>", None),
            Some("html".to_string())
        );
        assert_eq!(
            detect_format_from_bytes_and_ext(b"{\"key\": 123}", None),
            Some("json".to_string())
        );
    }

    #[test]
    fn test_commit_import_with_path_fencing() {
        let dir = tempdir().unwrap();
        let ws_root = dir.path();

        // 1. Commit válido dentro do workspace
        let res = commit_import(ws_root, "docs/guia.md", "# Guia Importado\n\nTexto.", false);
        assert!(res.is_ok());
        let path = res.unwrap();
        assert!(path.exists());
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "# Guia Importado\n\nTexto."
        );

        // 2. Destino já existente sem overwrite deve falhar com DestinationExists
        let col = commit_import(ws_root, "docs/guia.md", "Novo", false);
        assert!(matches!(col, Err(ImportError::DestinationExists(_))));

        // 3. Com overwrite deve funcionar
        let ovr = commit_import(ws_root, "docs/guia.md", "# Substituído", true);
        assert!(ovr.is_ok());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "# Substituído");

        // 4. Tentativa de escape com '..' deve ser rejeitada com OutsideWorkspace
        let esc = commit_import(ws_root, "../escape.md", "hacker", false);
        assert!(matches!(esc, Err(ImportError::OutsideWorkspace(_))));
    }
}
