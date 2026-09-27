use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NodeKind {
    Document,
    Heading,
    Block,
    Asset,
    Tag,
    Placeholder,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    pub kind: NodeKind,
    pub label: String,
    pub path: Option<String>,
}

impl GraphNode {
    pub fn document(path: &str, title: Option<&str>) -> Self {
        let label = title.unwrap_or(path).to_string();
        Self {
            id: format!("doc:{}", path.replace('\\', "/")),
            kind: NodeKind::Document,
            label,
            path: Some(path.replace('\\', "/")),
        }
    }

    pub fn heading(path: &str, anchor: &str, text: &str) -> Self {
        Self {
            id: format!("heading:{}#{}", path.replace('\\', "/"), anchor),
            kind: NodeKind::Heading,
            label: text.to_string(),
            path: Some(path.replace('\\', "/")),
        }
    }

    pub fn block(path: &str, block_id: &str) -> Self {
        Self {
            id: format!("block:{}#^{}", path.replace('\\', "/"), block_id),
            kind: NodeKind::Block,
            label: format!("^{block_id}"),
            path: Some(path.replace('\\', "/")),
        }
    }

    pub fn asset(path: &str) -> Self {
        Self {
            id: format!("asset:{}", path.replace('\\', "/")),
            kind: NodeKind::Asset,
            label: path.replace('\\', "/"),
            path: Some(path.replace('\\', "/")),
        }
    }

    pub fn tag(name: &str) -> Self {
        let clean = name.trim_start_matches('#');
        Self {
            id: format!("tag:{}", clean.to_lowercase()),
            kind: NodeKind::Tag,
            label: format!("#{clean}"),
            path: None,
        }
    }

    pub fn placeholder(target: &str) -> Self {
        Self {
            id: format!("placeholder:{}", target.trim().to_lowercase()),
            kind: NodeKind::Placeholder,
            label: target.trim().to_string(),
            path: None,
        }
    }
}
