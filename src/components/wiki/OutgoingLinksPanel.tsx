import type { ResolvedWikiLink } from "../../types/metadata";
import "../../styles/wiki-links.css";

export function OutgoingLinksPanel(props: {
  links: readonly ResolvedWikiLink[];
  onOpen: (path: string) => void | Promise<unknown>;
  onUnresolved: (target: string) => void;
}) {
  return (
    <section className="outgoing-links card" aria-labelledby="outgoing-links-title">
      <header>
        <h2 id="outgoing-links-title">Links</h2>
        <span>{props.links.length}</span>
      </header>
      {props.links.length === 0 ? (
        <p className="outgoing-links-empty">Nenhum wiki link neste documento.</p>
      ) : (
        <ul>
          {props.links.map((link, index) => {
            const resolved = link.status === "resolved" && !!link.path;
            return (
              <li key={`${link.target}:${link.line}:${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (resolved) void props.onOpen(link.path!);
                    else props.onUnresolved(link.target);
                  }}
                  title={resolved ? link.path! : `Nota não resolvida: ${link.target}`}
                >
                  <span>{link.alias || link.target}</span>
                  <small className={`wiki-status is-${link.status}`}>
                    {link.status === "resolved"
                      ? "resolvido"
                      : link.status === "ambiguous"
                        ? "ambíguo"
                        : "não resolvido"}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
