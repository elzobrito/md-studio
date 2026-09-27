use std::collections::BTreeSet;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::edge::GraphEdge;
use super::node::GraphNode;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphSnapshot {
    pub generation: u64,
    pub hash: String,
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

impl GraphSnapshot {
    pub fn new(generation: u64, nodes: BTreeSet<GraphNode>, edges: BTreeSet<GraphEdge>) -> Self {
        let node_list: Vec<GraphNode> = nodes.into_iter().collect();
        let edge_list: Vec<GraphEdge> = edges.into_iter().collect();

        let mut hasher = Sha256::new();
        hasher.update(generation.to_le_bytes());
        for n in &node_list {
            hasher.update(n.id.as_bytes());
        }
        for e in &edge_list {
            hasher.update(e.from.as_bytes());
            hasher.update(e.to.as_bytes());
            hasher.update(format!("{:?}", e.relation).as_bytes());
        }
        let hash = format!("{:x}", hasher.finalize());

        Self {
            generation,
            hash,
            nodes: node_list,
            edges: edge_list,
        }
    }
}
