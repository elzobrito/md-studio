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
  // KaTeX is the sole HTML producer here (trust:false, bounded expansion/size); adversarial math test covers CSS/HTML macros.
  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
  return <div className="math" dangerouslySetInnerHTML={{ __html: r.html }} />;
}
