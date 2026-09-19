import { useEffect, useRef, useState } from "react";
import { processMarkdown } from "../markdown/processor";
import type { ResolvedWikiLink } from "../types/metadata";

export function MarkdownViewer(props: {
  content: string;
  relativePath: string;
  wikiLinks?: readonly ResolvedWikiLink[];
  onOpenRelative?: (path: string) => void | Promise<unknown>;
  onUnresolvedWiki?: (target: string) => void;
  onRoot?: (el: HTMLElement | null) => void;
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
      void processMarkdown(props.content, { wikiLinks: props.wikiLinks }).then((r) => {
        if (alive && my === requestRef.current) setHtml(r.html);
      });
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [props.content, props.wikiLinks]);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a.wiki-link");
      if (!link || !root.contains(link)) return;
      event.preventDefault();
      event.stopPropagation();

      const wikiTarget = link.dataset.wikiTarget?.trim();
      if (!wikiTarget) return;
      const path = link.dataset.wikiPath?.trim();
      if (link.dataset.wikiStatus === "resolved" && path) {
        void props.onOpenRelative?.(path);
      } else {
        props.onUnresolvedWiki?.(wikiTarget);
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html, props.onOpenRelative, props.onUnresolvedWiki]);

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
