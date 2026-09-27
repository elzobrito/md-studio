use std::collections::{BTreeMap, BTreeSet};

use crate::index::document_metadata::DocumentMetadata;
use crate::index::MetadataIndex;

use super::edge::{EdgeRelation, GraphEdge};
use super::node::GraphNode;
use super::snapshot::GraphSnapshot;

#[derive(Debug, Default)]
pub struct KnowledgeGraph {
    pub(crate) generation: u64,
    pub(crate) nodes: BTreeMap<String, GraphNode>,
    pub(crate) edges: BTreeSet<GraphEdge>,
    pub(crate) placeholders: BTreeSet<String>,
}

impl KnowledgeGraph {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn generation(&self) -> u64 {
        self.generation
    }

    pub fn register_placeholder(&mut self, target: &str) {
        self.placeholders.insert(target.trim().to_lowercase());
        self.generation += 1;
    }

    pub fn remove_placeholder(&mut self, target: &str) {
        if self.placeholders.remove(&target.trim().to_lowercase()) {
            self.generation += 1;
        }
    }

    /// Projeta completamente o MetadataIndex em nós e arestas relacionais.
    pub fn rebuild_from_index(&mut self, index: &MetadataIndex) {
        self.generation += 1;
        self.nodes.clear();
        self.edges.clear();

        for doc in index.documents.values() {
            self.project_document(doc, index);
        }
    }

    /// Atualização incremental para um único documento modificado.
    pub fn update_document(&mut self, doc: &DocumentMetadata, index: &MetadataIndex) {
        self.generation += 1;
        let doc_id = format!("doc:{}", doc.path.to_string_lossy().replace('\\', "/"));

        // Remove old outgoing edges from this doc
        self.edges.retain(|e| e.from != doc_id);

        // Remove child heading/block nodes of this doc
        let prefix_heading = format!("heading:{}#", doc.path.to_string_lossy().replace('\\', "/"));
        let prefix_block = format!("block:{}#^", doc.path.to_string_lossy().replace('\\', "/"));
        self.nodes.retain(|k, _| !k.starts_with(&prefix_heading) && !k.starts_with(&prefix_block));

        self.project_document(doc, index);
    }

    /// Remove um documento deletado.
    pub fn remove_document(&mut self, path_str: &str) {
        self.generation += 1;
        let normalized = path_str.replace('\\', "/");
        let doc_id = format!("doc:{normalized}");

        self.nodes.remove(&doc_id);
        let prefix_heading = format!("heading:{normalized}#");
        let prefix_block = format!("block:{normalized}#^");
        self.nodes.retain(|k, _| !k.starts_with(&prefix_heading) && !k.starts_with(&prefix_block));

        self.edges.retain(|e| e.from != doc_id && e.to != doc_id);
    }

    fn project_document(&mut self, doc: &DocumentMetadata, index: &MetadataIndex) {
        let path_str = doc.path.to_string_lossy().replace('\\', "/");
        let doc_node = GraphNode::document(&path_str, doc.title.as_deref());
        let doc_id = doc_node.id.clone();
        self.nodes.insert(doc_id.clone(), doc_node);

        // 1. Headings (CONTAINS)
        for h in &doc.headings {
            let heading_node = GraphNode::heading(&path_str, &h.anchor, &h.text);
            let heading_id = heading_node.id.clone();
            self.nodes.insert(heading_id.clone(), heading_node);
            self.edges.insert(GraphEdge::new(&doc_id, &heading_id, EdgeRelation::Contains));
        }

        // 2. Blocks (CONTAINS)
        for b in &doc.blocks {
            let block_node = GraphNode::block(&path_str, &b.id);
            let block_id = block_node.id.clone();
            self.nodes.insert(block_id.clone(), block_node);
            self.edges.insert(GraphEdge::new(&doc_id, &block_id, EdgeRelation::Contains));
        }

        // 3. Tags (TAGGED_AS)
        for t in &doc.tags {
            let tag_node = GraphNode::tag(t);
            let tag_id = tag_node.id.clone();
            self.nodes.insert(tag_id.clone(), tag_node);
            self.edges.insert(GraphEdge::new(&doc_id, &tag_id, EdgeRelation::TaggedAs));
        }

        // 4. Assets / Images (USES)
        for img in &doc.images {
            let asset_node = GraphNode::asset(img);
            let asset_id = asset_node.id.clone();
            self.nodes.insert(asset_id.clone(), asset_node);
            self.edges.insert(GraphEdge::new(&doc_id, &asset_id, EdgeRelation::Uses));
        }

        // 5. Wiki Links
        for w in &doc.wiki_links {
            let target = w.target.trim();
            if target.contains("#^") {
                let parts: Vec<&str> = target.split("#^").collect();
                let doc_part = parts[0].trim();
                let block_part = parts.get(1).unwrap_or(&"").trim();

                let resolved = if doc_part.is_empty() {
                    Some(path_str.clone())
                } else {
                    index.resolve_wiki_link(doc_part).path.map(|p| p.to_string_lossy().replace('\\', "/"))
                };

                if let Some(target_path) = resolved {
                    let target_block_id = format!("block:{target_path}#^{block_part}");
                    if !self.nodes.contains_key(&target_block_id) {
                        self.nodes.insert(target_block_id.clone(), GraphNode::block(&target_path, block_part));
                    }
                    self.edges.insert(GraphEdge::new(&doc_id, &target_block_id, EdgeRelation::References));
                }
            } else if target.contains('#') {
                let parts: Vec<&str> = target.split('#').collect();
                let doc_part = parts[0].trim();
                let heading_part = parts.get(1).unwrap_or(&"").trim();

                let resolved = if doc_part.is_empty() {
                    Some(path_str.clone())
                } else {
                    index.resolve_wiki_link(doc_part).path.map(|p| p.to_string_lossy().replace('\\', "/"))
                };

                if let Some(target_path) = resolved {
                    let anchor = crate::index::metadata_extractor::slugify(heading_part);
                    let target_heading_id = format!("heading:{target_path}#{anchor}");
                    if !self.nodes.contains_key(&target_heading_id) {
                        self.nodes.insert(target_heading_id.clone(), GraphNode::heading(&target_path, &anchor, heading_part));
                    }
                    self.edges.insert(GraphEdge::new(&doc_id, &target_heading_id, EdgeRelation::References));
                }
            } else {
                let resolved = index.resolve_wiki_link(target);
                if let Some(target_path) = resolved.path {
                    let target_path_str = target_path.to_string_lossy().replace('\\', "/");
                    let target_doc_id = format!("doc:{target_path_str}");
                    self.edges.insert(GraphEdge::new(&doc_id, &target_doc_id, EdgeRelation::LinksTo));
                } else if self.placeholders.contains(&target.to_lowercase()) {
                    let placeholder_node = GraphNode::placeholder(target);
                    let placeholder_id = placeholder_node.id.clone();
                    self.nodes.insert(placeholder_id.clone(), placeholder_node);
                    self.edges.insert(GraphEdge::new(&doc_id, &placeholder_id, EdgeRelation::References));
                }
            }
        }
    }

    /// Snapshot determinístico do grafo atual.
    pub fn snapshot(&self) -> GraphSnapshot {
        let node_set: BTreeSet<GraphNode> = self.nodes.values().cloned().collect();
        GraphSnapshot::new(self.generation, node_set, self.edges.clone())
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }

    pub fn get_node(&self, id: &str) -> Option<&GraphNode> {
        self.nodes.get(id)
    }

    pub fn outgoing_edges(&self, from_id: &str) -> Vec<&GraphEdge> {
        self.edges.iter().filter(|e| e.from == from_id).collect()
    }

    pub fn incoming_edges(&self, to_id: &str) -> Vec<&GraphEdge> {
        self.edges.iter().filter(|e| e.to == to_id).collect()
    }
}
