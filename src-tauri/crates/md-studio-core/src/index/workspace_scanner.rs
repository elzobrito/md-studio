use std::path::{Path, PathBuf};
use crate::index::document_metadata::DocumentMetadata;
use crate::index::metadata_extractor::extract_metadata;

pub struct WorkspaceScanner {
    root: PathBuf,
}

impl WorkspaceScanner {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn scan(&self) -> Result<Vec<DocumentMetadata>, String> {
        let mut results = Vec::new();
        if !self.root.exists() || !self.root.is_dir() {
            return Ok(results);
        }
        self.scan_dir(&self.root, &mut results)?;
        Ok(results)
    }

    fn scan_dir(&self, dir: &Path, results: &mut Vec<DocumentMetadata>) -> Result<(), String> {
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return Ok(()), // Falha graciosa em diretórios sem permissão de leitura
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy();

            // Ignorar arquivos e pastas ocultos (prefixo .)
            if file_name.starts_with('.') {
                continue;
            }

            // Ignorar pastas de dependências ou build
            if file_name == "node_modules" || file_name == "target" || file_name == "dist" {
                continue;
            }

            if path.is_dir() {
                self.scan_dir(&path, results)?;
            } else if path.extension().map(|e| e.eq_ignore_ascii_case("md")).unwrap_or(false) {
                // Calcular caminho relativo ao root do workspace
                let relative_path = path
                    .strip_prefix(&self.root)
                    .map(|p| p.to_path_buf())
                    .unwrap_or_else(|_| path.clone());

                if let Ok(mut metadata) = extract_metadata(&path) {
                    metadata.path = relative_path;
                    results.push(metadata);
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_scanner_empty_workspace() {
        let temp = TempDir::new().expect("tempdir");
        let scanner = WorkspaceScanner::new(temp.path().to_path_buf());
        let results = scanner.scan().expect("scan");
        assert!(results.is_empty());
    }

    #[test]
    fn test_scanner_with_files_and_exclusions() {
        let temp = TempDir::new().expect("tempdir");
        let root = temp.path();

        // Criar arquivos válidos
        fs::write(root.join("README.md"), "# Projeto Principal\nTag: #inicio").expect("write");

        let sub = root.join("docs");
        fs::create_dir_all(&sub).expect("mkdir");
        fs::write(sub.join("guia.md"), "## Guia\nVeja [[README]]").expect("write");

        // Criar arquivos e pastas a serem ignorados
        let hidden = root.join(".mdstudio");
        fs::create_dir_all(&hidden).expect("mkdir");
        fs::write(hidden.join("index.md"), "# Ignorado").expect("write");

        let node_modules = root.join("node_modules");
        fs::create_dir_all(&node_modules).expect("mkdir");
        fs::write(node_modules.join("pkg.md"), "# Ignorado").expect("write");

        fs::write(root.join(".hidden.md"), "# Oculto").expect("write");
        fs::write(root.join("imagem.png"), "binario").expect("write");

        let scanner = WorkspaceScanner::new(root.to_path_buf());
        let results = scanner.scan().expect("scan");

        assert_eq!(results.len(), 2);

        let paths: Vec<String> = results
            .iter()
            .map(|r| r.path.to_string_lossy().replace('\\', "/"))
            .collect();

        assert!(paths.contains(&"README.md".to_string()));
        assert!(paths.contains(&"docs/guia.md".to_string()));
    }
}
