pub mod edge;
pub mod node;
pub mod projector;
pub mod query;
pub mod snapshot;

pub use edge::{EdgeRelation, GraphEdge};
pub use node::{GraphNode, NodeKind};
pub use projector::KnowledgeGraph;
pub use query::{ImpactReport, RelationshipPath, SubgraphResult};
pub use snapshot::GraphSnapshot;

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use crate::index::document_metadata::{BlockReference, DocumentMetadata, Heading, WikiLink};
    use crate::index::MetadataIndex;

    fn make_test_index() -> MetadataIndex {
        let mut index = MetadataIndex::new();

        // Doc A: Architecture
        index.insert(DocumentMetadata {
            path: PathBuf::from("docs/architecture.md"),
            title: Some("Architecture".to_string()),
            headings: vec![Heading {
                depth: 1,
                text: "Persistence".to_string(),
                anchor: "persistence".to_string(),
            }],
            links: vec![],
            wiki_links: vec![
                WikiLink {
                    target: "Security".to_string(),
                    alias: None,
                    line: 5,
                },
                WikiLink {
                    target: "Security#^token-auth".to_string(),
                    alias: None,
                    line: 7,
                },
                WikiLink {
                    target: "nota-futura".to_string(),
                    alias: None,
                    line: 10,
                },
            ],
            blocks: vec![BlockReference {
                id: "atomic-save".to_string(),
                line: 12,
                snippet: Some("Atomic save snippet".to_string()),
            }],
            tags: vec!["core".to_string()],
            images: vec!["assets/diagram.png".to_string()],
            tables: 0,
            mermaid_blocks: 0,
            katex_blocks: 0,
            word_count: 100,
            line_count: 20,
            last_modified: 100,
        });

        // Doc B: Security
        index.insert(DocumentMetadata {
            path: PathBuf::from("docs/security.md"),
            title: Some("Security".to_string()),
            headings: vec![],
            links: vec![],
            wiki_links: vec![],
            blocks: vec![BlockReference {
                id: "token-auth".to_string(),
                line: 8,
                snippet: Some("Auth block".to_string()),
            }],
            tags: vec!["security".to_string()],
            images: vec![],
            tables: 0,
            mermaid_blocks: 0,
            katex_blocks: 0,
            word_count: 50,
            line_count: 15,
            last_modified: 200,
        });

        index
    }

    #[test]
    fn test_knowledge_graph_rebuild_and_snapshot() {
        let index = make_test_index();
        let mut graph = KnowledgeGraph::new();
        graph.register_placeholder("nota-futura");
        graph.rebuild_from_index(&index);

        assert!(graph.node_count() >= 6); // 2 docs + heading + 2 blocks + asset + tag + placeholder
        assert!(graph.edge_count() >= 5);

        let snapshot = graph.snapshot();
        assert!(!snapshot.hash.is_empty());
        assert_eq!(snapshot.nodes.len(), graph.node_count());
        assert_eq!(snapshot.edges.len(), graph.edge_count());
    }

    #[test]
    fn test_knowledge_graph_subgraph_and_impact() {
        let index = make_test_index();
        let mut graph = KnowledgeGraph::new();
        graph.rebuild_from_index(&index);

        let center = "doc:docs/architecture.md";
        let sub = graph.get_subgraph(center, 1, None, 50);
        assert_eq!(sub.center_id, center);
        assert!(!sub.nodes.is_empty());
        assert!(!sub.edges.is_empty());
        assert!(!sub.truncated);

        // Impact of security.md
        let impact = graph.get_impact_report("doc:docs/security.md");
        assert_eq!(impact.inbound_count, 1);
        assert!(impact.directly_affected_documents.contains(&"docs/architecture.md".to_string()));
    }

    #[test]
    fn test_knowledge_graph_pathfinding() {
        let index = make_test_index();
        let mut graph = KnowledgeGraph::new();
        graph.rebuild_from_index(&index);

        let from = "doc:docs/architecture.md";
        let to = "doc:docs/security.md";
        let path = graph.find_path(from, to, None, 3).expect("path should exist");
        assert_eq!(path.length, 1);
        assert_eq!(path.steps, vec![from, to]);
    }
}
