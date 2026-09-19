import { useEffect, useRef, useState } from "react";
import { processMarkdown } from "../markdown/processor";

export function MarkdownViewer(props: {
  content: string;
  relativePath: string;
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
      void processMarkdown(props.content).then((r) => {
        if (alive && my === requestRef.current) setHtml(r.html);
      });
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [props.content]);

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
