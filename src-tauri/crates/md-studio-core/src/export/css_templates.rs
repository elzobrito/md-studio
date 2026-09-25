pub const EPUB_MAIN_CSS: &str = r#"
body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1em;
    line-height: 1.6;
    margin: 0 5%;
    color: #222;
}

h1, h2, h3, h4, h5, h6 {
    font-family: Arial, Helvetica, sans-serif;
    font-weight: bold;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
}

h1 { font-size: 1.8em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; }

p {
    margin: 0.8em 0;
    text-align: left;
}

code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85em;
    background: #f4f4f4;
    padding: 0.1em 0.3em;
    border-radius: 2px;
}

pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8em;
    background: #f4f4f4;
    padding: 1em;
    overflow-x: auto;
    page-break-inside: avoid;
    white-space: pre-wrap;
    word-wrap: break-word;
}

blockquote {
    border-left: 3px solid #ccc;
    margin: 1em 0;
    padding-left: 1em;
    color: #555;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.9em;
}

th, td {
    border: 1px solid #ccc;
    padding: 0.5em 0.8em;
    text-align: left;
}

th {
    background: #f0f0f0;
    font-weight: bold;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
}

.mermaid-fallback {
    background: #fff8e1;
    border: 1px solid #ffc107;
    padding: 1em;
    font-size: 0.8em;
    font-family: monospace;
}
"#;
