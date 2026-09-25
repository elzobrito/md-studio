use crate::export::epub_types::MermaidSlot;
use html5ever::tendril::TendrilSink;
use html5ever::{parse_document, parse_fragment, ParseOpts, QualName};
use markup5ever::{local_name, ns};
use markup5ever_rcdom::{Handle, NodeData, RcDom};
use std::cell::Cell;
use thiserror::Error;

#[derive(Debug, Error)]
#[error("{0}")]
pub struct ConversionError(pub String);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EpubHeading {
    pub level: u8,
    pub text: String,
    pub anchor: String,
}

const VOID_TAGS: &[&str] = &[
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track",
    "wbr",
];

pub fn html_to_xhtml(html: &str) -> Result<String, ConversionError> {
    let context = QualName::new(None, ns!(html), local_name!("body"));
    let dom = parse_fragment(
        RcDom::default(),
        ParseOpts::default(),
        context,
        Vec::new(),
        false,
    )
        .from_utf8()
        .one(html.as_bytes());
    let seq = Cell::new(1u32);
    let mut body = String::new();
    for child in dom.document.children.borrow().iter() {
        write_node(&mut body, child, &seq);
    }
    Ok(format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <!DOCTYPE html>\n\
         <html xmlns=\"http://www.w3.org/1999/xhtml\">\n\
         <head><title></title><link rel=\"stylesheet\" type=\"text/css\" href=\"styles/main.css\"/></head>\n\
         <body>\n{body}</body>\n</html>\n"
    ))
}

pub fn extract_headings(xhtml: &str) -> Vec<EpubHeading> {
    let dom = parse_document(RcDom::default(), ParseOpts::default())
        .from_utf8()
        .one(xhtml.as_bytes());
    let mut headings = Vec::new();
    for child in dom.document.children.borrow().iter() {
        collect_headings(child, &mut headings);
    }
    headings
}

pub fn apply_mermaid_slots(
    xhtml: &str,
    slots: &[MermaidSlot],
) -> Result<MermaidApply, ConversionError> {
    let mut output = xhtml.to_string();
    let mut staged = Vec::new();
    for (index, slot) in slots.iter().enumerate() {
        let token = format!("__MD_MERMAID_SLOT_{index}__");
        let needle = if slot.placeholder.is_empty() {
            format!("{{{{MERMAID:{}}}}}", slot.id)
        } else {
            slot.placeholder.clone()
        };
        if output.contains(&needle) {
            output = output.replace(&needle, &token);
            staged.push((token, slot));
        } else {
            staged.push((String::new(), slot));
        }
    }
    let mut mermaid_count = 0usize;
    let mut mermaid_fallback_count = 0usize;
    for (token, slot) in staged {
        let replacement = match slot.svg_content.as_deref().map(str::trim) {
            Some(svg) if !svg.is_empty() => {
                let id = safe_mermaid_id(&slot.id)?;
                mermaid_count += 1;
                format!(
                    "<img src=\"images/{}.svg\" alt=\"diagrama\"/>",
                    escape_attr(&id)
                )
            }
            _ => {
                mermaid_fallback_count += 1;
                format!(
                    "<pre class=\"mermaid-fallback\"><code>{}</code></pre>",
                    escape_text(&slot.source)
                )
            }
        };
        if !token.is_empty() {
            output = output.replace(&token, &replacement);
        }
    }
    Ok(MermaidApply {
        xhtml: output,
        mermaid_count,
        mermaid_fallback_count,
    })
}

pub struct MermaidApply {
    pub xhtml: String,
    pub mermaid_count: usize,
    pub mermaid_fallback_count: usize,
}

pub fn safe_mermaid_id(id: &str) -> Result<String, ConversionError> {
    let ok = !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.');
    if ok {
        Ok(id.to_string())
    } else {
        Err(ConversionError(format!("invalid mermaid id: {id}")))
    }
}

fn collect_headings(node: &Handle, headings: &mut Vec<EpubHeading>) {
    if let NodeData::Element { name, attrs, .. } = &node.data {
        let tag = name.local.as_ref();
        if let Some(level) = heading_level(tag) {
            let anchor = attrs
                .borrow()
                .iter()
                .find(|attr| attr.name.local.as_ref() == "id")
                .map(|attr| attr.value.to_string())
                .unwrap_or_default();
            if !anchor.is_empty() {
                headings.push(EpubHeading {
                    level,
                    text: element_text(node),
                    anchor,
                });
            }
        }
    }
    for child in node.children.borrow().iter() {
        collect_headings(child, headings);
    }
}

fn element_text(node: &Handle) -> String {
    let mut text = String::new();
    append_text(node, &mut text);
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn append_text(node: &Handle, text: &mut String) {
    match &node.data {
        NodeData::Text { contents } => text.push_str(&contents.borrow()),
        NodeData::Element { .. } => {
            for child in node.children.borrow().iter() {
                append_text(child, text);
            }
        }
        _ => {}
    }
}

fn write_node(out: &mut String, node: &Handle, seq: &Cell<u32>) {
    match &node.data {
        NodeData::Text { contents } => out.push_str(&escape_text(&contents.borrow())),
        NodeData::Element { name, attrs, .. } => {
            let tag = name.local.as_ref();
            if tag.is_empty() {
                return;
            }
            out.push('<');
            out.push_str(tag);
            let mut saw_id = false;
            for attr in attrs.borrow().iter() {
                let key = attr.name.local.as_ref();
                if key.is_empty() {
                    continue;
                }
                if key == "id" {
                    saw_id = true;
                }
                out.push(' ');
                out.push_str(key);
                out.push_str("=\"");
                out.push_str(&escape_attr(&attr.value));
                out.push('"');
            }
            if heading_level(tag).is_some() && !saw_id {
                let id = seq.get();
                seq.set(id + 1);
                out.push_str(" id=\"h-");
                out.push_str(&id.to_string());
                out.push('"');
            }
            if VOID_TAGS.contains(&tag) {
                out.push_str("/>");
                return;
            }
            out.push('>');
            for child in node.children.borrow().iter() {
                write_node(out, child, seq);
            }
            out.push_str("</");
            out.push_str(tag);
            out.push('>');
        }
        _ => {
            for child in node.children.borrow().iter() {
                write_node(out, child, seq);
            }
        }
    }
}

fn heading_level(tag: &str) -> Option<u8> {
    match tag {
        "h1" => Some(1),
        "h2" => Some(2),
        "h3" => Some(3),
        "h4" => Some(4),
        "h5" => Some(5),
        "h6" => Some(6),
        _ => None,
    }
}

pub fn escape_text(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            _ => out.push(ch),
        }
    }
    out
}

pub fn escape_attr(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '"' => out.push_str("&quot;"),
            _ => out.push(ch),
        }
    }
    out
}
