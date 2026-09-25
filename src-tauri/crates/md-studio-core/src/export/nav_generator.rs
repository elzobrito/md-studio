use crate::export::epub_types::EpubMetadata;
use crate::export::xhtml_converter::{escape_text, EpubHeading};

struct NavNode {
    heading: EpubHeading,
    children: Vec<NavNode>,
}

pub fn generate_nav_xhtml(headings: &[EpubHeading]) -> String {
    let tree = toc_tree(headings);
    let mut list = String::new();
    write_nav_list(&mut list, &tree);
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <!DOCTYPE html>\n\
         <html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\">\n\
         <head><title>Sumário</title></head>\n\
         <body>\n\
         <nav epub:type=\"toc\" id=\"toc\">\n\
         <h1>Sumário</h1>\n\
         {list}\
         </nav>\n\
         </body>\n\
         </html>\n"
    )
}

pub fn generate_toc_ncx(headings: &[EpubHeading], metadata: &EpubMetadata) -> String {
    let tree = toc_tree(headings);
    let mut play_order = 1u32;
    let mut points = String::new();
    write_nav_points(&mut points, &tree, &mut play_order);
    let uid = format!("urn:mdstudio:{}", escape_text(&metadata.title));
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <ncx xmlns=\"http://www.daisy.org/z3986/2005/ncx/\" version=\"2005-1\">\n\
         <head>\n\
         <meta name=\"dtb:uid\" content=\"{uid}\"/>\n\
         <meta name=\"dtb:depth\" content=\"2\"/>\n\
         <meta name=\"dtb:totalPageCount\" content=\"0\"/>\n\
         <meta name=\"dtb:maxPageNumber\" content=\"0\"/>\n\
         </head>\n\
         <docTitle><text>{}</text></docTitle>\n\
         <navMap>\n\
         {points}\
         </navMap>\n\
         </ncx>\n",
        escape_text(&metadata.title)
    )
}

fn toc_tree(headings: &[EpubHeading]) -> Vec<NavNode> {
    let mut roots = Vec::new();
    let mut current: Option<NavNode> = None;
    for heading in headings.iter().filter(|heading| heading.level <= 2) {
        if heading.level == 1 {
            if let Some(node) = current.take() {
                roots.push(node);
            }
            current = Some(NavNode {
                heading: heading.clone(),
                children: Vec::new(),
            });
        } else if let Some(parent) = current.as_mut() {
            parent.children.push(NavNode {
                heading: heading.clone(),
                children: Vec::new(),
            });
        } else {
            roots.push(NavNode {
                heading: heading.clone(),
                children: Vec::new(),
            });
        }
    }
    if let Some(node) = current {
        roots.push(node);
    }
    roots
}

fn write_nav_list(out: &mut String, nodes: &[NavNode]) {
    if nodes.is_empty() {
        out.push_str("<ol></ol>\n");
        return;
    }
    out.push_str("<ol>\n");
    for node in nodes {
        out.push_str("<li><a href=\"chapter.xhtml#");
        out.push_str(&escape_text(&node.heading.anchor));
        out.push_str("\">");
        out.push_str(&escape_text(&node.heading.text));
        out.push_str("</a>");
        if !node.children.is_empty() {
            out.push('\n');
            write_nav_list(out, &node.children);
        }
        out.push_str("</li>\n");
    }
    out.push_str("</ol>\n");
}

fn write_nav_points(out: &mut String, nodes: &[NavNode], play_order: &mut u32) {
    for node in nodes {
        let order = *play_order;
        *play_order += 1;
        out.push_str(&format!(
            "<navPoint id=\"navPoint-{order}\" playOrder=\"{order}\">\n\
             <navLabel><text>{}</text></navLabel>\n\
             <content src=\"chapter.xhtml#{}\"/>\n",
            escape_text(&node.heading.text),
            escape_text(&node.heading.anchor)
        ));
        if !node.children.is_empty() {
            write_nav_points(out, &node.children, play_order);
        }
        out.push_str("</navPoint>\n");
    }
}
