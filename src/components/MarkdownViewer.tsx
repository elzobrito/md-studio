import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { processMarkdown } from "../markdown/processor";
import type { ResolvedWikiLink } from "../types/metadata";
import { formatCode } from "../services/formatter";
import { replaceFencedCodeBlock } from "../markdown/fencedCode";
import { MermaidBlock } from "./MermaidBlock";
import { scrollToHeading, resolveRelativeLink, openExternalUrl } from "../services/navigation";

export function MarkdownViewer(props: {
  content: string;
  relativePath: string;
  wikiLinks?: readonly ResolvedWikiLink[];
  onOpenRelative?: (path: string) => void | Promise<unknown>;
  onUnresolvedWiki?: (target: string) => void;
  onRoot?: (el: HTMLElement | null) => void;
  onChangeContent?: (newContent: string) => void;
}) {
  const [html, setHtml] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const onRoot = props.onRoot;

  useEffect(() => {
    onRoot?.(bodyRef.current);
    return () => onRoot?.(null);
  }, [onRoot, html]);

  useEffect(() => {
    let alive = true;
    const my = ++requestRef.current;
    const t = window.setTimeout(() => {
      void processMarkdown(props.content, { wikiLinks: props.wikiLinks })
        .then((r) => {
          if (alive && my === requestRef.current) setHtml(r.html);
        })
        .catch((err) => {
          console.error("Erro ao processar markdown:", err);
          if (alive && my === requestRef.current) {
            setHtml(`<div class="preview-error"><p>Erro ao formatar visualização.</p></div>`);
          }
        });
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [props.content, props.wikiLinks]);

  // Handle all links navigation (wiki links, relative markdown links, anchors, external URLs)
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a");
      if (!link || !root.contains(link)) return;

      // Always prevent default Webview navigation to stop SPA resets
      event.preventDefault();
      event.stopPropagation();

      // 1. Wiki Links
      if (link.classList.contains("wiki-link")) {
        const wikiTarget = link.dataset.wikiTarget?.trim();
        if (!wikiTarget) return;
        const path = link.dataset.wikiPath?.trim();
        if (link.dataset.wikiStatus === "resolved" && path) {
          void props.onOpenRelative?.(path);
        } else {
          props.onUnresolvedWiki?.(wikiTarget);
        }
        return;
      }

      const href = link.getAttribute("href")?.trim() || "";
      if (!href || href === "#") return;

      // 2. Anchor Links (same document)
      if (href.startsWith("#")) {
        const slug = decodeURIComponent(href.slice(1));
        if (slug) {
          const scrolled = scrollToHeading(slug, root);
          if (!scrolled) {
            root
              .querySelector(
                `[id="${CSS.escape(slug)}"], [id="${CSS.escape("user-content-" + slug)}"], a[name="${CSS.escape(slug)}"]`,
              )
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        return;
      }

      // 3. External Web Links
      if (/^(https?:|mailto:|tel:)/i.test(href)) {
        void openExternalUrl(href);
        return;
      }

      // 4. Relative / Internal File Links (e.g. [outro](outro.md) or [docs](docs/README.md))
      const [pathPart, hashPart] = href.split("#");
      if (pathPart) {
        const decodedPath = decodeURIComponent(pathPart);
        const resolved = resolveRelativeLink(props.relativePath, decodedPath);
        void props.onOpenRelative?.(resolved);
      } else if (hashPart) {
        const slug = decodeURIComponent(hashPart);
        const scrolled = scrollToHeading(slug, root);
        if (!scrolled) {
          root
            .querySelector(
              `[id="${CSS.escape(slug)}"], [id="${CSS.escape("user-content-" + slug)}"], a[name="${CSS.escape(slug)}"]`,
            )
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html, props.relativePath, props.onOpenRelative, props.onUnresolvedWiki]);

  // Decorate code blocks with headers, Copy, and Format buttons
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const pres = root.querySelectorAll<HTMLPreElement>("pre.shiki");
    pres.forEach((pre, index) => {
      if (pre.parentElement?.classList.contains("code-block-container")) return;

      const lang =
        pre.getAttribute("data-language") ||
        Array.from(pre.classList)
          .find((c) => c.startsWith("language-"))
          ?.replace("language-", "") ||
        "code";

      const container = document.createElement("div");
      container.className = "code-block-container";

      const header = document.createElement("div");
      header.className = "code-block-header";

      const langSpan = document.createElement("span");
      langSpan.className = "code-block-lang";
      langSpan.textContent = lang;
      header.appendChild(langSpan);

      const actions = document.createElement("div");
      actions.className = "code-block-actions";

      // Format Button
      const formatBtn = document.createElement("button");
      formatBtn.type = "button";
      formatBtn.className = "code-block-action-format btn-action";
      formatBtn.title = "Formatar bloco de código";
      formatBtn.textContent = "Formatar";
      formatBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();

        const codeElement = pre.querySelector("code") || pre;
        const codeText = codeElement.textContent || "";
        formatBtn.textContent = "Formatando...";
        formatBtn.disabled = true;

        try {
          const res = await formatCode(lang, codeText);
          if (res.formatted) {
            formatBtn.textContent = "✓ Formatado!";
            formatBtn.classList.add("success");
            if (props.onChangeContent) {
              const updatedDoc = replaceFencedCodeBlock(props.content, index, res.code);
              props.onChangeContent(updatedDoc);
            }
          } else {
            formatBtn.textContent = res.error ? "Erro" : "Sem alterações";
          }
        } catch {
          formatBtn.textContent = "Erro";
        } finally {
          setTimeout(() => {
            formatBtn.textContent = "Formatar";
            formatBtn.disabled = false;
            formatBtn.classList.remove("success");
          }, 2000);
        }
      });
      actions.appendChild(formatBtn);

      // Copy Button
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "code-block-action-copy btn-action";
      copyBtn.title = "Copiar código";
      copyBtn.textContent = "Copiar";
      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const codeElement = pre.querySelector("code") || pre;
        const codeText = codeElement.textContent || "";
        await navigator.clipboard.writeText(codeText);
        copyBtn.textContent = "✓ Copiado!";
        copyBtn.classList.add("success");
        setTimeout(() => {
          copyBtn.textContent = "Copiar";
          copyBtn.classList.remove("success");
        }, 2000);
      });
      actions.appendChild(copyBtn);

      header.appendChild(actions);

      pre.parentNode?.insertBefore(container, pre);
      container.appendChild(header);
      container.appendChild(pre);
    });
  }, [html, props.content, props.onChangeContent]);

  // Mount interactive MermaidBlock components into .mermaid-diagram-container elements
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const containers = root.querySelectorAll<HTMLDivElement>(".mermaid-diagram-container");
    const mountedRoots: Root[] = [];

    containers.forEach((container) => {
      if (container.dataset.mounted === "true") return;
      container.dataset.mounted = "true";

      const code = container.dataset.mermaidCode || container.textContent || "";
      if (!code.trim()) return;

      container.innerHTML = "";
      const reactRoot = createRoot(container);
      reactRoot.render(<MermaidBlock source={code} />);
      mountedRoots.push(reactRoot);
    });

    return () => {
      mountedRoots.forEach((r) => {
        try {
          r.unmount();
        } catch {
          /* unmount safety */
        }
      });
    };
  }, [html]);

  return (
    <section className="preview" aria-label="Preview">
      <div
        ref={bodyRef}
        className="preview-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
