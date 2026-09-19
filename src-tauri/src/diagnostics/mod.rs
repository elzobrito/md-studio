use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Diagnostic {
    pub code: String,
    pub message: String,
    pub path: Option<String>,
}

pub fn safe_message(code: &str, detail: &str) -> Diagnostic {
    Diagnostic {
        code: code.into(),
        message: detail.chars().take(300).collect(),
        path: None,
    }
}
