import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { processMarkdown } from "../markdown/processor";
import type { ResolvedWikiLink, DocumentMetadata } from "../types/metadata";
import { formatCode } from "../services/formatter";
import { replaceFencedCodeBlock } from "../markdown/fencedCode";
import { MermaidBlock } from "./MermaidBlock";
import { scrollToHeading, resolveRelativeLink, openExternalUrl } from "../services/navigation";
import { groupAdjacentCodeTabs } from "../markdown/codeBlockMetadata";
import { findSourcePositionFromElement } from "../markdown/sourceMap";
import { HoverPreview, type HoverPreviewData, isSafeWorkspacePath } from "./editor/HoverPreview";
import { getDocumentMetadata, resolveWikiLink } from "../lib/ipc/metadata";

export function MarkdownViewer(props: {
  content: string;
  relativePath: string;
  wikiLinks?: readonly ResolvedWikiLink[];
  onOpenRelative?: (path: string) => void | Promise<unknown>;
  onUnresolvedWiki?: (target: string) => void;
  onRoot?: (el: HTMLElement | null) => void;
  onChangeContent?: (newContent: string) => void;
  onNavigateToSource?: (pos: { line?: number; offset?: number }) => void;
}) {
  const [html, setHtml] = useState("");
  const [hoverData, setHoverData] = useState<HoverPreviewData | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const activeHoverTarget = useRef<string | null>(null);
  const isOverPopover = useRef(false);
  const metadataCache = useRef<Map<string, DocumentMetadata | null>>(new Map());
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
      if (!link || !root.contains(link)) {
        // 5. Block-level navigation (Preview -> Source)
        const sourcePos = findSourcePositionFromElement(target, root);
        if (sourcePos && (sourcePos.line !== undefined || sourcePos.offset !== undefined)) {
          props.onNavigateToSource?.(sourcePos);
          window.dispatchEvent(
            new CustomEvent("md-preview:navigate-source", { detail: sourcePos })
          );
        }
        return;
      }

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

  // Handle hover previews for links (Wiki links, relative markdown links, anchors)
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const clearTimers = () => {
      if (hoverTimer.current) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a");
      if (!link || !root.contains(link)) return;

      let linkTarget = "";
      let isWiki = false;
      let isAnchor = false;
      let targetPath: string | null = null;
      let headingTarget: string | null = null;
      let initialStatus: "resolved" | "unresolved" | "ambiguous" = "resolved";
      let candidates: string[] = [];

      if (link.classList.contains("wiki-link")) {
        isWiki = true;
        linkTarget = link.dataset.wikiTarget?.trim() || "";
        targetPath = link.dataset.wikiPath?.trim() || null;
        const status = link.dataset.wikiStatus;
        if (status === "unresolved") initialStatus = "unresolved";
        else if (status === "ambiguous") initialStatus = "ambiguous";
        else initialStatus = "resolved";

        if (linkTarget.includes("#")) {
          const parts = linkTarget.split("#");
          linkTarget = parts[0];
          headingTarget = parts.slice(1).join("#");
        }
      } else {
        const href = link.getAttribute("href")?.trim() || "";
        if (!href || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) {
          return;
        }
        if (href.startsWith("#")) {
          isAnchor = true;
          headingTarget = decodeURIComponent(href.slice(1));
          linkTarget = headingTarget;
        } else {
          const [pathPart, hashPart] = href.split("#");
          const decodedPath = decodeURIComponent(pathPart);
          targetPath = resolveRelativeLink(props.relativePath, decodedPath);
          linkTarget = targetPath;
          if (hashPart) {
            headingTarget = decodeURIComponent(hashPart);
          }
        }
      }

      if (!linkTarget && !targetPath && !headingTarget) return;

      const currentTargetKey = linkTarget || targetPath || headingTarget || "";
      activeHoverTarget.current = currentTargetKey;

      clearTimers();
      const rect = link.getBoundingClientRect();
      const pos = { x: rect.left, y: rect.bottom + 6 };

      hoverTimer.current = window.setTimeout(async () => {
        if (activeHoverTarget.current !== currentTargetKey) return;

        if (targetPath && !isSafeWorkspacePath(targetPath)) {
          setHoverData({
            target: linkTarget || targetPath,
            status: "unresolved",
            error: "Destino fora do workspace",
          });
          setHoverPos(pos);
          return;
        }

        if (isAnchor && headingTarget) {
          const safeEscape =
            typeof CSS !== "undefined" && CSS.escape ? CSS.escape : (s: string) => s;
          const matchingHeading = root.querySelector(
            `[id="${safeEscape(headingTarget)}"], [id="${safeEscape("user-content-" + headingTarget)}"], a[name="${safeEscape(headingTarget)}"]`,
          );
          const headingText = matchingHeading?.textContent || headingTarget;
          if (activeHoverTarget.current !== currentTargetKey) return;
          setHoverData({
            target: `#${headingTarget}`,
            status: matchingHeading ? "resolved" : "unresolved",
            title: props.relativePath.split("/").pop() || "Documento atual",
            path: props.relativePath,
            headingTarget,
            snippet: matchingHeading
              ? `Seção no documento atual: ${headingText}`
              : "Seção não encontrada neste documento",
          });
          setHoverPos(pos);
          return;
        }

        if (initialStatus === "unresolved") {
          if (activeHoverTarget.current !== currentTargetKey) return;
          setHoverData({
            target: linkTarget,
            status: "unresolved",
          });
          setHoverPos(pos);
          return;
        }

        if (initialStatus === "ambiguous") {
          if (activeHoverTarget.current !== currentTargetKey) return;
          setHoverData({
            target: linkTarget,
            status: "ambiguous",
            candidates,
          });
          setHoverPos(pos);
          return;
        }

        if (activeHoverTarget.current !== currentTargetKey) return;
        setHoverData({
          target: linkTarget,
          status: "loading",
          path: targetPath,
        });
        setHoverPos(pos);

        try {
          let meta: DocumentMetadata | null = null;
          if (targetPath) {
            if (metadataCache.current.has(targetPath)) {
              meta = metadataCache.current.get(targetPath)!;
            } else {
              meta = await getDocumentMetadata(targetPath);
              metadataCache.current.set(targetPath, meta);
            }
          } else if (isWiki && linkTarget) {
            const res = await resolveWikiLink(linkTarget);
            if (activeHoverTarget.current !== currentTargetKey) return;
            if (res.status === "unresolved") {
              setHoverData({
                target: linkTarget,
                status: "unresolved",
              });
              return;
            }
            if (res.status === "ambiguous") {
              setHoverData({
                target: linkTarget,
                status: "ambiguous",
                candidates: res.candidates,
              });
              return;
            }
            if (res.path) {
              targetPath = res.path;
              if (metadataCache.current.has(targetPath)) {
                meta = metadataCache.current.get(targetPath)!;
              } else {
                meta = await getDocumentMetadata(targetPath);
                metadataCache.current.set(targetPath, meta);
              }
            }
          }

          if (activeHoverTarget.current !== currentTargetKey) return;

          if (meta) {
            setHoverData({
              target: linkTarget,
              status: "resolved",
              path: targetPath,
              title: meta.title || targetPath?.split("/").pop() || linkTarget,
              headings: meta.headings,
              tags: meta.tags,
              wordCount: meta.wordCount,
              lastModified: meta.lastModified,
              headingTarget,
              snippet:
                meta.headings && meta.headings.length > 0
                  ? `Primeira seção: ${meta.headings[0].text} (${meta.headings.length} seções)`
                  : `Documento com ${meta.wordCount || 0} palavras`,
            });
          } else {
            setHoverData({
              target: linkTarget,
              status: "resolved",
              path: targetPath,
              title: targetPath?.split("/").pop() || linkTarget,
              headingTarget,
              snippet: "Documento Markdown local",
            });
          }
        } catch {
          if (activeHoverTarget.current !== currentTargetKey) return;
          setHoverData({
            target: linkTarget,
            status: "unresolved",
          });
        }
      }, 200);
    };

    const handleMouseOut = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a");
      if (!link) return;

      activeHoverTarget.current = null;

      if (hoverTimer.current) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }

      const related = event.relatedTarget;
      if (related instanceof Element && related.closest(".hover-preview-popover")) {
        return;
      }

      setHoverData(null);
      setHoverPos(null);
    };

    root.addEventListener("mouseover", handleMouseOver);
    root.addEventListener("mouseout", handleMouseOut);

    return () => {
      clearTimers();
      root.removeEventListener("mouseover", handleMouseOver);
      root.removeEventListener("mouseout", handleMouseOut);
    };
  }, [html, props.relativePath, props.wikiLinks]);

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
      const tabTitle = pre.getAttribute("data-tab-title");
      if (tabTitle) {
        container.setAttribute("data-tab-title", tabTitle);
      }

      const header = document.createElement("div");
      header.className = "code-block-header";

      const filename = pre.getAttribute("data-filename");
      if (filename) {
        const fileSpan = document.createElement("span");
        fileSpan.className = "code-block-filename";
        fileSpan.textContent = filename;
        fileSpan.style.marginRight = "8px";
        fileSpan.style.fontWeight = "600";
        header.appendChild(fileSpan);
      }

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

    if (bodyRef.current) {
      groupAdjacentCodeTabs(bodyRef.current);
    }
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
      <HoverPreview
        data={hoverData}
        position={hoverPos}
        onMouseEnter={() => {
          isOverPopover.current = true;
          if (hideTimer.current) {
            window.clearTimeout(hideTimer.current);
            hideTimer.current = null;
          }
        }}
        onMouseLeave={() => {
          isOverPopover.current = false;
          setHoverData(null);
          setHoverPos(null);
        }}
        onClose={() => {
          setHoverData(null);
          setHoverPos(null);
        }}
      />
    </section>
  );
}
