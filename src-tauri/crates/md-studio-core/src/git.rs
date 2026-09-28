use git2::{DiffOptions, Repository, Status, StatusOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GitError {
    #[error("not a git repository")]
    NotARepository,
    #[error("path fence violation: '{0}'")]
    PathFenceViolation(String),
    #[error("git error: {0}")]
    Git2(#[from] git2::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("blob not found")]
    BlobNotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "M" | "A" | "D" | "R"
    pub is_staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffGutter {
    pub added_lines: Vec<u32>,
    pub modified_lines: Vec<u32>,
    pub deleted_lines: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitSummary {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub summary: String,
}

pub struct GitProvider;

impl GitProvider {
    /// Normaliza e valida path relativo prevenindo directory traversal
    pub fn normalize_rel_path(rel_path: &str) -> Result<String, GitError> {
        let norm = rel_path.replace('\\', "/").trim().to_string();
        if norm.is_empty()
            || norm.starts_with('/')
            || norm.starts_with("../")
            || norm.contains("/../")
            || norm == ".."
            || norm.contains(':')
        {
            return Err(GitError::PathFenceViolation(rel_path.to_string()));
        }
        Ok(norm)
    }

    /// Verifica de forma rápida e segura se a pasta é raiz ou parte de um repositório Git
    pub fn is_repository(workspace_path: &Path) -> bool {
        Repository::discover(workspace_path).is_ok()
    }

    /// Obtém o status simplificado dos arquivos (M/A/D/R) no workspace
    pub fn get_status(workspace_path: &Path) -> Result<Vec<GitFileStatus>, GitError> {
        let repo = Repository::discover(workspace_path).map_err(|_| GitError::NotARepository)?;
        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .include_ignored(false);

        let statuses = repo.statuses(Some(&mut opts))?;
        let mut results = Vec::new();

        for entry in statuses.iter() {
            let status_flags = entry.status();
            let path = entry.path()?.replace('\\', "/");

            let mut code = "M";
            let mut is_staged = false;

            if status_flags.intersects(Status::INDEX_NEW | Status::WT_NEW) {
                code = "A";
            } else if status_flags.intersects(Status::INDEX_DELETED | Status::WT_DELETED) {
                code = "D";
            } else if status_flags.intersects(Status::INDEX_RENAMED | Status::WT_RENAMED) {
                code = "R";
            } else if status_flags.intersects(Status::INDEX_MODIFIED | Status::WT_MODIFIED) {
                code = "M";
            }

            if status_flags.intersects(
                Status::INDEX_NEW
                    | Status::INDEX_MODIFIED
                    | Status::INDEX_DELETED
                    | Status::INDEX_RENAMED
                    | Status::INDEX_TYPECHANGE,
            ) {
                is_staged = true;
            }

            results.push(GitFileStatus {
                path,
                status: code.to_string(),
                is_staged,
            });
        }

        results.sort_by(|a, b| a.path.cmp(&b.path));
        Ok(results)
    }

    /// Calcula os números de linhas adicionadas/modificadas/deletadas para o gutter do CodeMirror
    pub fn get_file_diff(
        workspace_path: &Path,
        rel_path: &str,
    ) -> Result<FileDiffGutter, GitError> {
        let norm_path = Self::normalize_rel_path(rel_path)?;
        let repo = Repository::discover(workspace_path).map_err(|_| GitError::NotARepository)?;

        let head_tree = match repo.head().and_then(|h| h.peel_to_tree()) {
            Ok(tree) => Some(tree),
            Err(_) => None, // Initial commit / empty repo
        };

        let mut diff_opts = DiffOptions::new();
        diff_opts.pathspec(&norm_path);

        let diff = repo.diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut diff_opts))?;

        let mut gutter = FileDiffGutter::default();

        diff.foreach(
            &mut |_delta, _progress| true,
            None,
            None,
            Some(&mut |_delta, _hunk, line| {
                let origin = line.origin();
                if origin == '+' {
                    if let Some(new_lineno) = line.new_lineno() {
                        gutter.added_lines.push(new_lineno);
                    }
                } else if origin == '-' {
                    if let Some(old_lineno) = line.old_lineno() {
                        gutter.deleted_lines.push(old_lineno);
                    }
                }
                true
            }),
        )?;

        // Deduplicar e ordenar linhas
        gutter.added_lines.sort_unstable();
        gutter.added_lines.dedup();
        gutter.modified_lines.sort_unstable();
        gutter.modified_lines.dedup();
        gutter.deleted_lines.sort_unstable();
        gutter.deleted_lines.dedup();

        Ok(gutter)
    }

    /// Retorna o histórico de commits do arquivo ativo
    pub fn get_file_history(
        workspace_path: &Path,
        rel_path: &str,
        limit: usize,
    ) -> Result<Vec<GitCommitSummary>, GitError> {
        let norm_path = Self::normalize_rel_path(rel_path)?;
        let repo = Repository::discover(workspace_path).map_err(|_| GitError::NotARepository)?;

        let head = match repo.head() {
            Ok(h) => h,
            Err(_) => return Ok(vec![]),
        };

        let head_oid = match head.target() {
            Some(oid) => oid,
            None => return Ok(vec![]),
        };

        let mut revwalk = repo.revwalk()?;
        revwalk.push(head_oid)?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut history = Vec::new();
        let limit = if limit == 0 { 20 } else { limit };

        for oid_res in revwalk {
            if history.len() >= limit {
                break;
            }

            let oid = match oid_res {
                Ok(id) => id,
                Err(_) => continue,
            };

            let commit = match repo.find_commit(oid) {
                Ok(c) => c,
                Err(_) => continue,
            };

            // Verificar se o commit modificou o arquivo norm_path
            let mut touched = false;
            let tree = match commit.tree() {
                Ok(t) => t,
                Err(_) => continue,
            };

            if commit.parent_count() == 0 {
                // Primeiro commit do repositório
                if tree.get_path(Path::new(&norm_path)).is_ok() {
                    touched = true;
                }
            } else {
                for parent in commit.parents() {
                    if let Ok(parent_tree) = parent.tree() {
                        let mut diff_opts = DiffOptions::new();
                        diff_opts.pathspec(&norm_path);
                        if let Ok(diff) = repo.diff_tree_to_tree(
                            Some(&parent_tree),
                            Some(&tree),
                            Some(&mut diff_opts),
                        ) {
                            if diff.deltas().len() > 0 {
                                touched = true;
                                break;
                            }
                        }
                    }
                }
            }

            if touched {
                let author = commit.author().name().unwrap_or("Unknown").to_string();
                let time_sec = commit.time().seconds();
                let date = format!("{}", time_sec * 1000);
                let summary = commit
                    .summary()?
                    .unwrap_or("No commit message")
                    .to_string();

                history.push(GitCommitSummary {
                    hash: oid.to_string(),
                    short_hash: oid.to_string()[..7.min(oid.to_string().len())].to_string(),
                    author,
                    date,
                    summary,
                });
            }
        }

        Ok(history)
    }

    /// Retorna o conteúdo do arquivo no commit HEAD (ou commit específico)
    pub fn get_file_at_commit(
        workspace_path: &Path,
        rel_path: &str,
        commit_hash: Option<&str>,
    ) -> Result<String, GitError> {
        let norm_path = Self::normalize_rel_path(rel_path)?;
        let repo = Repository::discover(workspace_path).map_err(|_| GitError::NotARepository)?;

        let tree = if let Some(hash) = commit_hash {
            let oid = git2::Oid::from_str(hash).map_err(|_| GitError::BlobNotFound)?;
            let commit = repo.find_commit(oid)?;
            commit.tree()?
        } else {
            repo.head()?.peel_to_tree()?
        };

        let entry = tree
            .get_path(Path::new(&norm_path))
            .map_err(|_| GitError::BlobNotFound)?;

        let blob = repo.find_blob(entry.id())?;
        let content = String::from_utf8_lossy(blob.content()).to_string();
        Ok(content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn init_test_repo(path: &Path) -> Repository {
        let repo = Repository::init(path).unwrap();
        let mut config = repo.config().unwrap();
        config.set_str("user.name", "Tester").unwrap();
        config.set_str("user.email", "tester@example.com").unwrap();
        repo
    }

    #[test]
    fn test_is_repository_detection() {
        let dir = tempdir().unwrap();
        assert!(!GitProvider::is_repository(dir.path()));

        init_test_repo(dir.path());
        assert!(GitProvider::is_repository(dir.path()));
    }

    #[test]
    fn test_status_new_modified_files() {
        let dir = tempdir().unwrap();
        let repo = init_test_repo(dir.path());

        // Criar novo arquivo
        let file_path = dir.path().join("test.md");
        fs::write(&file_path, "# Initial").unwrap();

        let status = GitProvider::get_status(dir.path()).unwrap();
        assert_eq!(status.len(), 1);
        assert_eq!(status[0].path, "test.md");
        assert_eq!(status[0].status, "A");

        // Fazer commit
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("test.md")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let sig = repo.signature().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[]).unwrap();

        // Modificar arquivo
        fs::write(&file_path, "# Initial\nLine 2").unwrap();

        let status_mod = GitProvider::get_status(dir.path()).unwrap();
        assert_eq!(status_mod.len(), 1);
        assert_eq!(status_mod[0].status, "M");
    }

    #[test]
    fn test_diff_gutter_and_history() {
        let dir = tempdir().unwrap();
        let repo = init_test_repo(dir.path());
        let file_path = dir.path().join("doc.md");
        fs::write(&file_path, "Line 1\nLine 2\nLine 3").unwrap();

        let mut index = repo.index().unwrap();
        index.add_path(Path::new("doc.md")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let sig = repo.signature().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Add doc.md", &tree, &[]).unwrap();

        // Modificar doc adicionando Linha 4
        fs::write(&file_path, "Line 1\nLine 2\nLine 3\nLine 4").unwrap();

        let diff = GitProvider::get_file_diff(dir.path(), "doc.md").unwrap();
        assert!(diff.added_lines.contains(&4));

        let history = GitProvider::get_file_history(dir.path(), "doc.md", 10).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].summary, "Add doc.md");

        let content_head = GitProvider::get_file_at_commit(dir.path(), "doc.md", None).unwrap();
        assert_eq!(content_head, "Line 1\nLine 2\nLine 3");
    }

    #[test]
    fn test_path_fence_rejection() {
        let dir = tempdir().unwrap();
        init_test_repo(dir.path());

        let err = GitProvider::get_file_diff(dir.path(), "../escape.md").unwrap_err();
        assert!(matches!(err, GitError::PathFenceViolation(_)));
    }
}
