use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::{DocumentMetadata, MetadataIndex, WikiLink};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum WikiLinkStatus {
    Resolved,
    Unresolved,
    Ambiguous,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedWikiLink {
    pub target: String,
    pub alias: Option<String>,
    pub line: usize,
    pub status: WikiLinkStatus,
    pub path: Option<PathBuf>,
    pub candidates: Vec<PathBuf>,
}

impl MetadataIndex {
    /// Resolve a wiki target using only the in-memory index.
    ///
    /// Precedence is: exact relative path (with or without `.md`), then
    /// case-insensitive file stem, then case-insensitive document title.
    /// Non-unique matches are reported as ambiguous instead of choosing a file.
    pub fn resolve_wiki_link(&self, target: &str) -> ResolvedWikiLink {
        self.resolve_link(&WikiLink {
            target: target.to_owned(),
            alias: None,
            line: 0,
        })
    }

    pub fn resolve_all(&self, document: &DocumentMetadata) -> Vec<ResolvedWikiLink> {
        document
            .wiki_links
            .iter()
            .map(|link| self.resolve_link(link))
            .collect()
    }

    fn resolve_link(&self, link: &WikiLink) -> ResolvedWikiLink {
        let target = link.target.trim();
        if target.is_empty() || !is_safe_relative_target(target) {
            return result_for(link, WikiLinkStatus::Unresolved, vec![]);
        }

        let normalized = target.replace('\\', "/");
        let exact = exact_path_candidates(self, &normalized);
        if !exact.is_empty() {
            return result_for_matches(link, exact);
        }

        let lookup = target.strip_suffix(".md").unwrap_or(target);
        let stem_matches = sorted_paths(self.documents.keys().filter(|path| {
            path.file_stem()
                .and_then(|stem| stem.to_str())
                .is_some_and(|stem| stem.eq_ignore_ascii_case(lookup))
        }));
        if !stem_matches.is_empty() {
            return result_for_matches(link, stem_matches);
        }

        let title_matches = sorted_paths(self.documents.iter().filter_map(|(path, doc)| {
            doc.title
                .as_deref()
                .is_some_and(|title| title.trim().eq_ignore_ascii_case(target))
                .then_some(path)
        }));
        result_for_matches(link, title_matches)
    }
}

fn is_safe_relative_target(target: &str) -> bool {
    let path = Path::new(target);
    !path.is_absolute()
        && path
            .components()
            .all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}

fn exact_path_candidates(index: &MetadataIndex, target: &str) -> Vec<PathBuf> {
    let mut variants = vec![target.to_owned()];
    if Path::new(target).extension().is_none() {
        variants.push(format!("{target}.md"));
    }

    sorted_paths(index.documents.keys().filter(|path| {
        let indexed = path.to_string_lossy().replace('\\', "/");
        variants.iter().any(|candidate| indexed == *candidate)
    }))
}

fn sorted_paths<'a>(paths: impl Iterator<Item = &'a PathBuf>) -> Vec<PathBuf> {
    let mut paths: Vec<PathBuf> = paths.cloned().collect();
    paths.sort();
    paths.dedup();
    paths
}

fn result_for_matches(link: &WikiLink, matches: Vec<PathBuf>) -> ResolvedWikiLink {
    match matches.len() {
        0 => result_for(link, WikiLinkStatus::Unresolved, matches),
        1 => result_for(link, WikiLinkStatus::Resolved, matches),
        _ => result_for(link, WikiLinkStatus::Ambiguous, matches),
    }
}

fn result_for(
    link: &WikiLink,
    status: WikiLinkStatus,
    candidates: Vec<PathBuf>,
) -> ResolvedWikiLink {
    let path = (status == WikiLinkStatus::Resolved)
        .then(|| candidates.first().cloned())
        .flatten();
    ResolvedWikiLink {
        target: link.target.clone(),
        alias: link.alias.clone(),
        line: link.line,
        status,
        path,
        candidates,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn document(path: &str, title: Option<&str>, links: Vec<WikiLink>) -> DocumentMetadata {
        DocumentMetadata {
            path: PathBuf::from(path),
            title: title.map(str::to_owned),
            headings: vec![],
            links: vec![],
            wiki_links: links,
            tags: vec![],
            images: vec![],
            tables: 0,
            mermaid_blocks: 0,
            katex_blocks: 0,
            word_count: 0,
            line_count: 0,
            last_modified: 0,
        }
    }

    fn link(target: &str, alias: Option<&str>, line: usize) -> WikiLink {
        WikiLink {
            target: target.to_owned(),
            alias: alias.map(str::to_owned),
            line,
        }
    }

    fn index() -> MetadataIndex {
        let mut index = MetadataIndex::new();
        index.insert(document("docs/Guide.md", Some("User Guide"), vec![]));
        index.insert(document("notes/intro.md", Some("Introduction"), vec![]));
        index
    }

    #[test]
    fn resolves_exact_path_with_or_without_extension() {
        let index = index();
        for target in ["docs/Guide.md", "docs/Guide"] {
            let result = index.resolve_wiki_link(target);
            assert_eq!(result.status, WikiLinkStatus::Resolved);
            assert_eq!(result.path, Some(PathBuf::from("docs/Guide.md")));
        }
    }

    #[test]
    fn resolves_stem_and_title_case_insensitively() {
        let index = index();
        assert_eq!(
            index.resolve_wiki_link("GUIDE").path,
            Some(PathBuf::from("docs/Guide.md"))
        );
        assert_eq!(
            index.resolve_wiki_link("user guide").path,
            Some(PathBuf::from("docs/Guide.md"))
        );
    }

    #[test]
    fn reports_missing_unsafe_and_ambiguous_targets() {
        let mut index = index();
        index.insert(document("archive/guide.md", Some("Old Guide"), vec![]));

        assert_eq!(
            index.resolve_wiki_link("missing").status,
            WikiLinkStatus::Unresolved
        );
        assert_eq!(
            index.resolve_wiki_link("../outside").status,
            WikiLinkStatus::Unresolved
        );
        let ambiguous = index.resolve_wiki_link("guide");
        assert_eq!(ambiguous.status, WikiLinkStatus::Ambiguous);
        assert_eq!(ambiguous.path, None);
        assert_eq!(ambiguous.candidates.len(), 2);
    }

    #[test]
    fn resolve_all_preserves_alias_and_source_line() {
        let index = index();
        let source = document("source.md", None, vec![link("Guide", Some("Read this"), 9)]);

        let resolved = index.resolve_all(&source);
        assert_eq!(resolved[0].alias.as_deref(), Some("Read this"));
        assert_eq!(resolved[0].line, 9);
        assert_eq!(resolved[0].path, Some(PathBuf::from("docs/Guide.md")));
    }
}
