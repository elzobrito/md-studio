use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::document_metadata::DocumentMetadata;
use super::metadata_index::MetadataIndex;
use super::wiki_resolve::WikiLinkStatus;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BacklinkOccurrence {
    pub source_path: PathBuf,
    pub line: usize,
    pub context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BacklinkGroup {
    pub source_path: PathBuf,
    pub source_title: Option<String>,
    pub occurrences: Vec<BacklinkOccurrence>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BacklinkResult {
    pub target_path: PathBuf,
    pub document_count: usize,
    pub occurrence_count: usize,
    pub groups: Vec<BacklinkGroup>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Edge {
    target: PathBuf,
    source: PathBuf,
    line: usize,
}

#[derive(Debug, Clone, Default)]
pub struct BacklinkIndex {
    /// Normalized target path → incoming edges (no context).
    by_target: HashMap<String, Vec<Edge>>,
}

impl BacklinkIndex {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn rebuild(&mut self, index: &MetadataIndex) {
        self.by_target.clear();
        for document in index.all() {
            self.ingest_source(&document.path, index);
        }
    }

    pub fn replace_source(&mut self, source: &Path, index: &MetadataIndex) {
        self.remove_source(source);
        self.ingest_source(source, index);
    }

    pub fn remove_source(&mut self, source: &Path) {
        let source_key = normalize_path(source);
        for edges in self.by_target.values_mut() {
            edges.retain(|edge| normalize_path(&edge.source) != source_key);
        }
        self.by_target.retain(|_, edges| !edges.is_empty());
    }

    pub fn backlinks_for(&self, target: &Path, meta: &MetadataIndex) -> BacklinkResult {
        let target_path = PathBuf::from(normalize_path(target));
        let mut grouped: HashMap<String, BacklinkGroup> = HashMap::new();

        if let Some(edges) = self.by_target.get(&normalize_path(target)) {
            for edge in edges {
                let source_key = normalize_path(&edge.source);
                let group = grouped.entry(source_key.clone()).or_insert_with(|| {
                    let source_path = PathBuf::from(&source_key);
                    let source_title = lookup_title(meta, &source_path);
                    BacklinkGroup {
                        source_path,
                        source_title,
                        occurrences: Vec::new(),
                    }
                });
                group.occurrences.push(BacklinkOccurrence {
                    source_path: PathBuf::from(&source_key),
                    line: edge.line,
                    context: None,
                });
            }
        }

        let mut groups: Vec<BacklinkGroup> = grouped.into_values().collect();
        for group in &mut groups {
            group.occurrences.sort_by_key(|occurrence| occurrence.line);
        }
        groups.sort_by(|a, b| {
            let title_a = a.source_title.as_deref().unwrap_or("").to_ascii_lowercase();
            let title_b = b.source_title.as_deref().unwrap_or("").to_ascii_lowercase();
            title_a
                .cmp(&title_b)
                .then_with(|| {
                    normalize_path(&a.source_path).cmp(&normalize_path(&b.source_path))
                })
        });

        let document_count = groups.len();
        let occurrence_count = groups.iter().map(|group| group.occurrences.len()).sum();
        BacklinkResult {
            target_path,
            document_count,
            occurrence_count,
            groups,
        }
    }

    fn ingest_source(&mut self, source: &Path, index: &MetadataIndex) {
        let Some(document) = lookup_document(index, source) else {
            return;
        };
        let source_key = normalize_path(&document.path);
        let source_path = PathBuf::from(&source_key);

        for resolved in index.resolve_all(document) {
            if resolved.status != WikiLinkStatus::Resolved {
                continue;
            }
            let Some(target) = resolved.path.as_ref() else {
                continue;
            };
            let target_key = normalize_path(target);
            if target_key.is_empty() || target_key == source_key {
                continue;
            }
            self.by_target
                .entry(target_key.clone())
                .or_default()
                .push(Edge {
                    target: PathBuf::from(&target_key),
                    source: source_path.clone(),
                    line: resolved.line,
                });
        }
    }
}

fn normalize_path(path: &Path) -> String {
    let raw = path.to_string_lossy().replace('\\', "/");
    let trimmed = raw.trim_start_matches("./").trim_end_matches('/');
    trimmed.to_string()
}

fn lookup_document<'a>(index: &'a MetadataIndex, source: &Path) -> Option<&'a DocumentMetadata> {
    let key = PathBuf::from(normalize_path(source));
    index.get(&key).or_else(|| {
        index.documents.iter().find_map(|(path, document)| {
            (normalize_path(path) == normalize_path(source)).then_some(document)
        })
    })
}

fn lookup_title(index: &MetadataIndex, source: &Path) -> Option<String> {
    lookup_document(index, source).and_then(|document| document.title.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::index::document_metadata::WikiLink;

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

    fn index_with(docs: Vec<DocumentMetadata>) -> MetadataIndex {
        let mut index = MetadataIndex::new();
        for doc in docs {
            index.insert(doc);
        }
        index
    }

    fn rebuilt(meta: &MetadataIndex) -> BacklinkIndex {
        let mut backlinks = BacklinkIndex::new();
        backlinks.rebuild(meta);
        backlinks
    }

    #[test]
    fn empty_workspace_has_no_backlinks() {
        let meta = MetadataIndex::new();
        let backlinks = rebuilt(&meta);
        let result = backlinks.backlinks_for(Path::new("missing.md"), &meta);
        assert_eq!(result.document_count, 0);
        assert_eq!(result.occurrence_count, 0);
        assert!(result.groups.is_empty());
        assert!(result.groups.iter().all(|group| {
            group
                .occurrences
                .iter()
                .all(|occurrence| occurrence.context.is_none())
        }));
    }

    #[test]
    fn indexes_resolved_only_and_ignores_alias() {
        let meta = index_with(vec![
            document("notes/guide.md", Some("Guide"), vec![]),
            document(
                "notes/index.md",
                Some("Index"),
                vec![link("guide", Some("Read this"), 4)],
            ),
        ]);
        let result = rebuilt(&meta).backlinks_for(Path::new("notes/guide.md"), &meta);
        assert_eq!(result.document_count, 1);
        assert_eq!(result.occurrence_count, 1);
        assert_eq!(result.groups[0].source_path, PathBuf::from("notes/index.md"));
        assert_eq!(result.groups[0].occurrences[0].line, 4);
        assert_eq!(result.groups[0].occurrences[0].context, None);
    }

    #[test]
    fn skips_unresolved_ambiguous_and_unsafe_targets() {
        let meta = index_with(vec![
            document("docs/Guide.md", Some("User Guide"), vec![]),
            document("archive/guide.md", Some("Old Guide"), vec![]),
            document(
                "notes/src.md",
                Some("Source"),
                vec![
                    link("missing", None, 2),
                    link("../outside", None, 3),
                    link("guide", None, 4),
                    link("docs/Guide.md", None, 5),
                ],
            ),
        ]);
        let backlinks = rebuilt(&meta);
        let ambiguous_target = backlinks.backlinks_for(Path::new("docs/Guide.md"), &meta);
        assert_eq!(ambiguous_target.occurrence_count, 1);
        assert_eq!(ambiguous_target.groups[0].occurrences[0].line, 5);
        assert_eq!(
            backlinks
                .backlinks_for(Path::new("archive/guide.md"), &meta)
                .occurrence_count,
            0
        );
    }

    #[test]
    fn discards_self_links_before_public_store() {
        let meta = index_with(vec![document(
            "notes/loop.md",
            Some("Loop"),
            vec![link("loop", None, 1), link("notes/loop.md", None, 2)],
        )]);
        let result = rebuilt(&meta).backlinks_for(Path::new("notes/loop.md"), &meta);
        assert_eq!(result.document_count, 0);
        assert_eq!(result.occurrence_count, 0);
    }

    #[test]
    fn indexes_unicode_resolved_targets() {
        let meta = index_with(vec![
            document("notas/café.md", Some("Café"), vec![]),
            document(
                "diario.md",
                Some("Diário"),
                vec![link("café", None, 8)],
            ),
        ]);
        let result = rebuilt(&meta).backlinks_for(Path::new("notas/café.md"), &meta);
        assert_eq!(result.occurrence_count, 1);
        assert_eq!(result.groups[0].source_path, PathBuf::from("diario.md"));
        assert_eq!(result.groups[0].occurrences[0].line, 8);
    }

    #[test]
    fn replace_source_is_idempotent_and_drops_old_edges() {
        let mut meta = index_with(vec![
            document("a.md", Some("A"), vec![]),
            document("b.md", Some("B"), vec![]),
            document("src.md", Some("Src"), vec![link("a", None, 1), link("a", None, 3)]),
        ]);
        let mut backlinks = rebuilt(&meta);
        let first = backlinks.backlinks_for(Path::new("a.md"), &meta);
        assert_eq!(first.occurrence_count, 2);

        meta.insert(document("src.md", Some("Src"), vec![link("b", None, 9)]));
        backlinks.replace_source(Path::new("src.md"), &meta);
        backlinks.replace_source(Path::new("src.md"), &meta);

        assert_eq!(
            backlinks
                .backlinks_for(Path::new("a.md"), &meta)
                .occurrence_count,
            0
        );
        let retargeted = backlinks.backlinks_for(Path::new("b.md"), &meta);
        assert_eq!(retargeted.document_count, 1);
        assert_eq!(retargeted.occurrence_count, 1);
        assert_eq!(retargeted.groups[0].occurrences[0].line, 9);
    }

    #[test]
    fn remove_source_drops_incoming_edges() {
        let meta = index_with(vec![
            document("target.md", Some("Target"), vec![]),
            document("gone.md", Some("Gone"), vec![link("target", None, 6)]),
        ]);
        let mut backlinks = rebuilt(&meta);
        backlinks.remove_source(Path::new("gone.md"));
        assert_eq!(
            backlinks
                .backlinks_for(Path::new("target.md"), &meta)
                .occurrence_count,
            0
        );
    }

    #[test]
    fn sorts_groups_by_title_ci_then_path_and_occurrences_line_asc() {
        let meta = index_with(vec![
            document("z.md", Some("Target"), vec![]),
            document(
                "b.md",
                Some("beta"),
                vec![link("z", None, 20), link("z", None, 4)],
            ),
            document("a.md", Some("Alpha"), vec![link("z", None, 7)]),
            document("c.md", None, vec![link("z", None, 1)]),
        ]);
        let result = rebuilt(&meta).backlinks_for(Path::new("z.md"), &meta);
        let paths: Vec<_> = result
            .groups
            .iter()
            .map(|group| group.source_path.to_string_lossy().into_owned())
            .collect();
        assert_eq!(paths, vec!["c.md", "a.md", "b.md"]);
        assert_eq!(
            result.groups[2]
                .occurrences
                .iter()
                .map(|occurrence| occurrence.line)
                .collect::<Vec<_>>(),
            vec![4, 20]
        );
        assert_eq!(result.document_count, 3);
        assert_eq!(result.occurrence_count, 4);
    }
}
