use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use crate::index::metadata_index::MetadataIndex;

pub const INDEX_DIR: &str = ".mdstudio";
pub const INDEX_FILE: &str = "index.json";

/// Retorna o caminho canônico do arquivo de índice no workspace.
pub fn index_path(workspace: &Path) -> PathBuf {
    workspace.join(INDEX_DIR).join(INDEX_FILE)
}

/// Salva o MetadataIndex em disco de forma atômica no diretório .mdstudio/index.json.
pub fn save_index(index: &MetadataIndex, workspace: &Path) -> Result<(), String> {
    let dir = workspace.join(INDEX_DIR);
    fs::create_dir_all(&dir).map_err(|e| format!("Falha ao criar diretório {}: {}", dir.display(), e))?;

    let target_path = dir.join(INDEX_FILE);
    let json = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Falha ao serializar MetadataIndex: {}", e))?;

    // Gravação atômica: arquivo temporário no mesmo diretório para permitir rename atômico
    let tmp_path = dir.join(format!("{}.tmp.{}", INDEX_FILE, std::process::id()));
    {
        let mut file = fs::File::create(&tmp_path)
            .map_err(|e| format!("Falha ao criar arquivo temporário de índice: {}", e))?;
        file.write_all(json.as_bytes())
            .map_err(|e| format!("Falha ao gravar arquivo temporário de índice: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Falha no sync do índice: {}", e))?;
    }

    fs::rename(&tmp_path, &target_path)
        .map_err(|e| format!("Falha ao renomear índice atômico: {}", e))?;

    Ok(())
}

/// Carrega o MetadataIndex do workspace se existir. Retorna None se não existir.
pub fn load_index(workspace: &Path) -> Result<Option<MetadataIndex>, String> {
    let path = index_path(workspace);
    if !path.exists() {
        return Ok(None);
    }

    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Falha ao ler {}: {}", path.display(), e))?;

    let index: MetadataIndex = serde_json::from_str(&json)
        .map_err(|e| format!("Falha ao desserializar {}: {}", path.display(), e))?;

    Ok(Some(index))
}

/// Remove apenas o arquivo de índice de metadados. Não toca em nenhum arquivo de usuário.
pub fn clear_index(workspace: &Path) -> Result<(), String> {
    let path = index_path(workspace);
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Falha ao remover arquivo de índice {}: {}", path.display(), e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use crate::index::document_metadata::DocumentMetadata;

    #[test]
    fn test_index_persistence_lifecycle() {
        let temp = TempDir::new().expect("tempdir");
        let ws = temp.path();

        // 1. Inicialmente não existe
        let initial = load_index(ws).expect("load_index");
        assert!(initial.is_none());

        // 2. Salvar novo índice
        let mut index = MetadataIndex::new();
        index.indexed_at = 12345678;
        index.insert(DocumentMetadata {
            path: PathBuf::from("docs/intro.md"),
            title: Some("Introdução".to_string()),
            headings: vec![],
            links: vec![],
            wiki_links: vec![],
            tags: vec!["teste".to_string()],
            images: vec![],
            tables: 0,
            mermaid_blocks: 0,
            katex_blocks: 0,
            word_count: 10,
            line_count: 5,
            last_modified: 1000,
        });

        save_index(&index, ws).expect("save_index");
        assert!(index_path(ws).exists());

        // 3. Carregar índice e conferir igualdade
        let loaded = load_index(ws).expect("load_index").expect("should exist");
        assert_eq!(loaded.indexed_at, 12345678);
        assert_eq!(loaded.len(), 1);
        assert!(loaded.contains(&PathBuf::from("docs/intro.md")));

        // 4. Limpar índice
        clear_index(ws).expect("clear_index");
        assert!(!index_path(ws).exists());
        assert!(load_index(ws).expect("load_index").is_none());
    }
}
