import { renderMath } from "../markdown/math";

export function MathBlock(props: { source: string; display?: boolean }) {
  const r = renderMath(props.source, !!props.display);
  if (r.error) {
    return (
      <div className="math-error" role="alert">
        Erro KaTeX: {r.error}
      </div>
    );
  }
  return <div className="math" dangerouslySetInnerHTML={{ __html: r.html }} />;
}
