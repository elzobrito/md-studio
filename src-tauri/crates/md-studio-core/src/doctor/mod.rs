use std::collections::HashSet;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

use crate::index::document_metadata::DocumentMetadata;
use crate::index::metadata_index::MetadataIndex;
use crate::index::metadata_extractor::extract_bracket_paren;
use crate::workspace::resolve_within;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DoctorQuickFix {
    pub label: String,
    pub replacement: String,
    pub line: usize,
    pub start_col: usize,
    pub end_col: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DoctorDiagnostic {
    pub rule: String,
    pub severity: String, // "error" | "warning" | "info"
    pub message: String,
    pub path: PathBuf,
    pub line: usize,
    pub start_col: usize,
    pub end_col: usize,
    pub target: Option<String>,
    pub suggestion: Option<String>,
    pub quick_fix: Option<DoctorQuickFix>,
}

pub struct Doctor;

impl Doctor {
    /// Executa o diagnóstico estrutural sobre o documento e o índice do workspace.
    pub fn diagnose(
        doc_rel_path: &Path,
        content: &str,
        metadata: &DocumentMetadata,
        index: &MetadataIndex,
        workspace_root: &Path,
    ) -> Vec<DoctorDiagnostic> {
        let mut diagnostics = Vec::new();

use crate::index::wiki_resolve::WikiLinkStatus;

        // 1. Diagnosticar Wiki Links quebrados (unresolved)
        for wl in &metadata.wiki_links {
            let resolved = index.resolve_wiki_link(&wl.target);
            if resolved.status == WikiLinkStatus::Unresolved {
                diagnostics.push(DoctorDiagnostic {
                    rule: "broken-wiki-link".to_string(),
                    severity: "warning".to_string(),
                    message: format!("Wiki Link '[[{}]]' não encontrado no workspace", wl.target),
                    path: doc_rel_path.to_path_buf(),
                    line: wl.line,
                    start_col: 0,
                    end_col: 0,
                    target: Some(wl.target.clone()),
                    suggestion: None,
                    quick_fix: None,
                });
            }
        }

        // 2. Diagnosticar Cabeçalhos com âncoras duplicadas
        let mut seen_anchors = HashSet::new();
        for h in &metadata.headings {
            if !seen_anchors.insert(h.anchor.clone()) {
                diagnostics.push(DoctorDiagnostic {
                    rule: "duplicate-heading-anchor".to_string(),
                    severity: "warning".to_string(),
                    message: format!("Cabeçalho '{}' gera âncora duplicada '#{}'", h.text, h.anchor),
                    path: doc_rel_path.to_path_buf(),
                    line: 1,
                    start_col: 0,
                    end_col: 0,
                    target: Some(h.anchor.clone()),
                    suggestion: Some(format!("{}-1", h.anchor)),
                    quick_fix: None,
                });
            }
        }

        // 3. Varredura por linha para blocos técnicos e assets
        let lines: Vec<&str> = content.lines().collect();
        for (idx, line_str) in lines.iter().enumerate() {
            let line_no = idx + 1;
            let trimmed = line_str.trim();

            // Verificar blocos técnicos vazios ou sem linguagem
            if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
                let info = trimmed.trim_start_matches('`').trim_start_matches('~').trim();
                if info.is_empty() {
                    diagnostics.push(DoctorDiagnostic {
                        rule: "unannotated-code-block".to_string(),
                        severity: "info".to_string(),
                        message: "Bloco de código sem especificação de linguagem".to_string(),
                        path: doc_rel_path.to_path_buf(),
                        line: line_no,
                        start_col: 0,
                        end_col: trimmed.len(),
                        target: None,
                        suggestion: Some("```markdown".to_string()),
                        quick_fix: None,
                    });
                }
            }

            // Checar imagens ![alt](url) na linha
            let chars: Vec<char> = line_str.chars().collect();
            let mut i = 0;
            while i < chars.len() {
                if chars[i] == '!' && i + 1 < chars.len() && chars[i + 1] == '[' {
                    if let Some((_alt, url, end)) = extract_bracket_paren(&chars, i + 1) {
                        let is_remote = url.starts_with("http://")
                            || url.starts_with("https://")
                            || url.starts_with("data:")
                            || url.starts_with("blob:");

                        if !is_remote && !url.is_empty() {
                            let clean_url = url.split('#').next().unwrap_or("").split('?').next().unwrap_or("");
                            let test_path = Path::new(clean_url);
                            let doc_dir = doc_rel_path.parent().unwrap_or_else(|| Path::new(""));

                            let rel_candidate = doc_dir.join(test_path);
                            let root_candidate = test_path;

                            let rel_candidate_str = rel_candidate.to_string_lossy();
                            let root_candidate_str = root_candidate.to_string_lossy();

                            let safe_rel = resolve_within(workspace_root, &rel_candidate_str);
                            let safe_root = resolve_within(workspace_root, &root_candidate_str);

                            if safe_rel.is_err() && safe_root.is_err() {
                                diagnostics.push(DoctorDiagnostic {
                                    rule: "insecure-asset-path".to_string(),
                                    severity: "error".to_string(),
                                    message: format!("Asset '{}' aponta para fora do workspace", url),
                                    path: doc_rel_path.to_path_buf(),
                                    line: line_no,
                                    start_col: i,
                                    end_col: end,
                                    target: Some(url.clone()),
                                    suggestion: None,
                                    quick_fix: None,
                                });
                            } else {
                                let exists_rel = safe_rel.map(|p| p.exists()).unwrap_or(false);
                                let exists_root = safe_root.map(|p| p.exists()).unwrap_or(false);

                                if !exists_rel && !exists_root {
                                    diagnostics.push(DoctorDiagnostic {
                                        rule: "missing-asset".to_string(),
                                        severity: "error".to_string(),
                                        message: format!("Asset '{}' não foi encontrado no workspace", url),
                                        path: doc_rel_path.to_path_buf(),
                                        line: line_no,
                                        start_col: i,
                                        end_col: end,
                                        target: Some(url.clone()),
                                        suggestion: None,
                                        quick_fix: None,
                                    });
                                }
                            }
                        }
                        i = end;
                        continue;
                    }
                }
                i += 1;
            }
        }

        diagnostics
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use crate::index::metadata_extractor::extract_metadata_from_str;

    #[test]
    fn test_doctor_diagnoses_broken_wiki_link_and_missing_asset() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();

        let doc_content = "# Meu Doc\n\n[[nota-inexistente]]\n\n![Foto](img/nao-existe.png)\n";
        let meta = extract_metadata_from_str(Path::new("doc.md"), doc_content, 0);
        let index = MetadataIndex::new();

        let diags = Doctor::diagnose(Path::new("doc.md"), doc_content, &meta, &index, root);
        assert_eq!(diags.len(), 2);
        assert!(diags.iter().any(|d| d.rule == "broken-wiki-link" && d.line == 3));
        assert!(diags.iter().any(|d| d.rule == "missing-asset" && d.line == 5));
    }

    #[test]
    fn test_doctor_rejects_path_outside_workspace() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();

        let doc_content = "![Escape](../../../../etc/passwd)\n";
        let meta = extract_metadata_from_str(Path::new("doc.md"), doc_content, 0);
        let index = MetadataIndex::new();

        let diags = Doctor::diagnose(Path::new("doc.md"), doc_content, &meta, &index, root);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].rule, "insecure-asset-path");
        assert_eq!(diags[0].severity, "error");
        assert!(diags[0].quick_fix.is_none());
    }

    #[test]
    fn test_doctor_detects_duplicate_heading_anchors() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();

        let doc_content = "# Teste\n\n# Teste\n";
        let meta = extract_metadata_from_str(Path::new("doc.md"), doc_content, 0);
        let index = MetadataIndex::new();

        let diags = Doctor::diagnose(Path::new("doc.md"), doc_content, &meta, &index, root);
        assert!(diags.iter().any(|d| d.rule == "duplicate-heading-anchor"));
    }
}
