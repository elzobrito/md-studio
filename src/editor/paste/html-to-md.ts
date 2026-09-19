export function htmlToMarkdown(html: string): string {
  // If no HTML tags are detected, return text unchanged
  if (!html.includes("<") || !html.includes(">")) {
    return html;
  }

  // Parse HTML using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const result = nodeToMarkdown(doc.body).trim();
  // Preserve trailing newline if originally had blocks
  return result;
}

interface Context {
  ordered?: boolean;
  index?: number;
  inPre?: boolean;
}

function nodeToMarkdown(node: Node, ctx: Context = {}): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (ctx.inPre) return text;
    // Collapse internal whitespace in normal flow
    return text.replace(/[\r\n\t]+/g, " ");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // If inside <pre>, children (like <code>) just return their text
  if (ctx.inPre) {
    let inner = "";
    for (const child of Array.from(el.childNodes)) {
      inner += nodeToMarkdown(child, ctx);
    }
    return inner;
  }

  const childrenMd = (childCtx: Context = ctx): string => {
    let out = "";
    for (const child of Array.from(el.childNodes)) {
      out += nodeToMarkdown(child, childCtx);
    }
    return out;
  };

  switch (tag) {
    case "h1":
      return `# ${childrenMd().trim()}\n\n`;
    case "h2":
      return `## ${childrenMd().trim()}\n\n`;
    case "h3":
      return `### ${childrenMd().trim()}\n\n`;
    case "h4":
      return `#### ${childrenMd().trim()}\n\n`;
    case "h5":
      return `##### ${childrenMd().trim()}\n\n`;
    case "h6":
      return `###### ${childrenMd().trim()}\n\n`;

    case "strong":
    case "b": {
      const content = childrenMd().trim();
      return content ? `**${content}**` : "";
    }

    case "em":
    case "i": {
      const content = childrenMd().trim();
      return content ? `_${content}_` : "";
    }

    case "del":
    case "s": {
      const content = childrenMd().trim();
      return content ? `~~${content}~~` : "";
    }

    case "code": {
      const content = el.textContent || "";
      return content ? `\`${content}\`` : "";
    }

    case "pre": {
      const codeEl = el.querySelector("code");
      const langClass = codeEl?.className || el.className || "";
      const langMatch = langClass.match(/language-([a-zA-Z0-9_-]+)/);
      const lang = langMatch ? langMatch[1] : "";
      const text = (codeEl ? codeEl.textContent : el.textContent) || "";
      return `\`\`\`${lang}\n${text.trim()}\n\`\`\`\n\n`;
    }

    case "a": {
      const text = childrenMd().trim() || el.getAttribute("href") || "";
      const href = el.getAttribute("href") || "";
      return `[${text}](${href})`;
    }

    case "img": {
      const alt = el.getAttribute("alt") || "";
      const src = el.getAttribute("src") || "";
      return `![${alt}](${src})`;
    }

    case "hr":
      return `---\n\n`;

    case "br":
      return `\n`;

    case "p": {
      const text = childrenMd().trim();
      return text ? `${text}\n\n` : "\n";
    }

    case "ul": {
      let out = "";
      const lis = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === "li");
      for (const li of lis) {
        out += nodeToMarkdown(li, { ordered: false });
      }
      return out ? `${out}\n` : "";
    }

    case "ol": {
      let out = "";
      const lis = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === "li");
      lis.forEach((li, idx) => {
        out += nodeToMarkdown(li, { ordered: true, index: idx + 1 });
      });
      return out ? `${out}\n` : "";
    }

    case "li": {
      const text = childrenMd().trim();
      if (ctx.ordered) {
        return `${ctx.index ?? 1}. ${text}\n`;
      }
      return `- ${text}\n`;
    }

    case "blockquote": {
      const text = childrenMd().trim();
      const lines = text.split("\n").map((l) => `> ${l}`).join("\n");
      return `${lines}\n\n`;
    }

    default:
      return childrenMd();
  }
}
