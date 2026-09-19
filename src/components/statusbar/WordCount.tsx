import { useEffect, useState } from "react";
import { editorStore } from "../../state/editor";

export function WordCount({ content }: { content?: string }) {
  const [wordCount, setWordCount] = useState(() => editorStore.getWordCount());

  useEffect(() => {
    if (content !== undefined) {
      const timer = window.setTimeout(() => {
        const tokens = content.trim().split(/\s+/).filter(Boolean);
        const count = content.trim() ? tokens.length : 0;
        editorStore.setWordCount(count);
        setWordCount(count);
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [content]);

  useEffect(() => {
    return editorStore.subscribe(() => {
      setWordCount(editorStore.getWordCount());
    });
  }, []);

  const formatted = new Intl.NumberFormat("pt-BR").format(wordCount);

  return (
    <span className="status-bar-item word-count" title="Contagem total de palavras">
      {formatted} {wordCount === 1 ? "palavra" : "palavras"}
    </span>
  );
}
