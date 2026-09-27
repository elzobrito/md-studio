use std::collections::{BTreeSet, HashMap, VecDeque};
use serde::{Deserialize, Serialize};

use super::edge::{EdgeRelation, GraphEdge};
use super::node::GraphNode;
use super::projector::KnowledgeGraph;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubgraphResult {
    pub center_id: String,
    pub depth: u8,
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipPath {
    pub from: String,
    pub to: String,
    pub steps: Vec<String>,
    pub edges: Vec<GraphEdge>,
    pub length: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImpactReport {
    pub target_id: String,
    pub inbound_count: usize,
    pub directly_affected_documents: Vec<String>,
    pub inbound_edges: Vec<GraphEdge>,
}

impl KnowledgeGraph {
    /// Consulta de subgrafo contextual por BFS com profundidade controlada (1 ou 2 hops).
    pub fn get_subgraph(
        &self,
        center_id: &str,
        depth: u8,
        allowed_relations: Option<&[EdgeRelation]>,
        node_cap: usize,
    ) -> SubgraphResult {
        let mut visited_nodes: BTreeSet<String> = BTreeSet::new();
        let mut collected_edges: BTreeSet<GraphEdge> = BTreeSet::new();
        let mut queue: VecDeque<(String, u8)> = VecDeque::new();
        let mut truncated = false;

        if self.get_node(center_id).is_some() {
            visited_nodes.insert(center_id.to_string());
            queue.push_back((center_id.to_string(), 0));
        }

        while let Some((current_id, current_depth)) = queue.pop_front() {
            if current_depth >= depth {
                continue;
            }

            // Both outgoing and incoming edges for neighborhood context
            for edge in self.edges.iter() {
                if let Some(allowed) = allowed_relations {
                    if !allowed.contains(&edge.relation) {
                        continue;
                    }
                }

                let neighbor = if edge.from == current_id {
                    Some(edge.to.clone())
                } else if edge.to == current_id {
                    Some(edge.from.clone())
                } else {
                    None
                };

                if let Some(next_id) = neighbor {
                    if visited_nodes.len() >= node_cap {
                        truncated = true;
                        break;
                    }

                    collected_edges.insert(edge.clone());
                    if visited_nodes.insert(next_id.clone()) {
                        queue.push_back((next_id, current_depth + 1));
                    }
                }
            }

            if truncated {
                break;
            }
        }

        let nodes: Vec<GraphNode> = visited_nodes
            .into_iter()
            .filter_map(|id| self.get_node(&id).cloned())
            .collect();

        SubgraphResult {
            center_id: center_id.to_string(),
            depth,
            nodes,
            edges: collected_edges.into_iter().collect(),
            truncated,
        }
    }

    /// Encontrar menor caminho entre dois nós via BFS.
    pub fn find_path(
        &self,
        from_id: &str,
        to_id: &str,
        allowed_relations: Option<&[EdgeRelation]>,
        max_depth: u8,
    ) -> Option<RelationshipPath> {
        if from_id == to_id {
            return Some(RelationshipPath {
                from: from_id.to_string(),
                to: to_id.to_string(),
                steps: vec![from_id.to_string()],
                edges: vec![],
                length: 0,
            });
        }

        let mut queue: VecDeque<(String, u8)> = VecDeque::new();
        let mut parent: HashMap<String, (String, GraphEdge)> = HashMap::new();
        let mut visited: BTreeSet<String> = BTreeSet::new();

        queue.push_back((from_id.to_string(), 0));
        visited.insert(from_id.to_string());

        let mut found = false;

        while let Some((curr, depth)) = queue.pop_front() {
            if depth >= max_depth {
                continue;
            }

            for edge in self.outgoing_edges(&curr) {
                if let Some(allowed) = allowed_relations {
                    if !allowed.contains(&edge.relation) {
                        continue;
                    }
                }

                let next = &edge.to;
                if !visited.contains(next) {
                    visited.insert(next.clone());
                    parent.insert(next.clone(), (curr.clone(), (*edge).clone()));

                    if next == to_id {
                        found = true;
                        break;
                    }
                    queue.push_back((next.clone(), depth + 1));
                }
            }

            if found {
                break;
            }
        }

        if !found {
            return None;
        }

        // Reconstruct path
        let mut steps = Vec::new();
        let mut edges = Vec::new();
        let mut curr = to_id.to_string();

        steps.push(curr.clone());
        while let Some((p, edge)) = parent.get(&curr) {
            edges.push(edge.clone());
            curr = p.clone();
            steps.push(curr.clone());
            if curr == from_id {
                break;
            }
        }

        steps.reverse();
        edges.reverse();
        let length = edges.len();

        Some(RelationshipPath {
            from: from_id.to_string(),
            to: to_id.to_string(),
            steps,
            edges,
            length,
        })
    }

    /// Análise de impacto reverso para qualquer nó canônico.
    pub fn get_impact_report(&self, target_id: &str) -> ImpactReport {
        let inbound = self.incoming_edges(target_id);
        let inbound_edges: Vec<GraphEdge> = inbound.into_iter().cloned().collect();

        let mut affected_docs = BTreeSet::new();
        for edge in &inbound_edges {
            if edge.from.starts_with("doc:") {
                let doc_path = edge.from.strip_prefix("doc:").unwrap_or(&edge.from);
                affected_docs.insert(doc_path.to_string());
            }
        }

        ImpactReport {
            target_id: target_id.to_string(),
            inbound_count: inbound_edges.len(),
            directly_affected_documents: affected_docs.into_iter().collect(),
            inbound_edges,
        }
    }
}
