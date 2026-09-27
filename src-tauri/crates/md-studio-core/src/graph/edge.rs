use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EdgeRelation {
    Contains,
    LinksTo,
    References,
    Uses,
    TaggedAs,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    pub relation: EdgeRelation,
}

impl GraphEdge {
    pub fn new(from: &str, to: &str, relation: EdgeRelation) -> Self {
        Self {
            from: from.to_string(),
            to: to.to_string(),
            relation,
        }
    }
}
