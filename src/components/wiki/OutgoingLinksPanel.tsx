import { useState } from "react";
import type { ResolvedWikiLink } from "../../types/metadata";
import "../../styles/wiki-links.css";

export function OutgoingLinksPanel(props: {
  links: readonly ResolvedWikiLink[];
  onOpen: (path: string) => void | Promise<unknown>;
  onUnresolved: (target: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className={`outgoing-links card${!isExpanded ? " is-collapsed" : ""}`} aria-labelledby="outgoing-links-title">
      <header
        className="panel-accordion-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        title={isExpanded ? "Recolher links" : "Expandir links"}
      >
        <div className="panel-accordion-title">
          <span className="accordion-chevron" aria-hidden="true">
            {isExpanded ? "▼" : "▶"}
          </span>
          <h2 id="outgoing-links-title">Links</h2>
        </div>
        <span className="panel-accordion-count">{props.links.length}</span>
      </header>
      {isExpanded &&
        (props.links.length === 0 ? (
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
        ))}
    </section>
  );
}
