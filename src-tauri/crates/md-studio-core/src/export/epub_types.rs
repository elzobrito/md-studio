use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

fn default_title() -> String {
    "Sem título".into()
}

fn default_lang() -> String {
    "pt-BR".into()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EpubMetadata {
    #[serde(default = "default_title")]
    pub title: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default = "default_lang")]
    pub lang: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub date: String,
}

impl Default for EpubMetadata {
    fn default() -> Self {
        Self {
            title: default_title(),
            author: None,
            lang: default_lang(),
            description: None,
            date: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MermaidSlot {
    pub id: String,
    #[serde(default)]
    pub placeholder: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub svg_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EpubExportPayload {
    #[serde(default)]
    pub metadata: EpubMetadata,
    #[serde(default)]
    pub body_html: String,
    #[serde(default)]
    pub mermaid_slots: Vec<MermaidSlot>,
    #[serde(default)]
    pub image_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EpubExportResult {
    pub output_path: String,
    pub image_count: usize,
    pub mermaid_count: usize,
    pub mermaid_fallback_count: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManifestItem {
    pub id: String,
    pub href: String,
    pub media_type: String,
    pub properties: Option<String>,
}

pub fn normalize_metadata(mut metadata: EpubMetadata) -> EpubMetadata {
    if metadata.title.trim().is_empty() {
        metadata.title = default_title();
    }
    if metadata.lang.trim().is_empty() {
        metadata.lang = default_lang();
    }
    metadata.author = metadata
        .author
        .map(|author| author.trim().to_string())
        .filter(|author| !author.is_empty());
    metadata.description = metadata
        .description
        .map(|description| description.trim().to_string())
        .filter(|description| !description.is_empty());
    if metadata.date.trim().is_empty() {
        metadata.date = utc_today();
    }
    metadata
}

fn utc_today() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let z = (secs / 86_400) as i64 + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { y + 1 } else { y };
    format!("{year:04}-{month:02}-{day:02}")
}
