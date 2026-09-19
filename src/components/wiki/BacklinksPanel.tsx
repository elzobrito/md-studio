import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { BacklinkGroup, BacklinkResult } from "../../types/metadata";
import { Button } from "../ui/Button";
import "../../styles/wiki-links.css";

export function backlinkCountLabel(documentCount: number, occurrenceCount: number): string {
  const docs = documentCount === 1 ? "1 documento" : `${documentCount} documentos`;
  const refs = occurrenceCount === 1 ? "1 referência" : `${occurrenceCount} referências`;
  return `${docs} · ${refs}`;
}

export function backlinkGroupTitle(group: BacklinkGroup): string {
  if (group.sourceTitle && group.sourceTitle.trim()) return group.sourceTitle;
  const parts = group.sourcePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || group.sourcePath;
}

type FocusId = string;

function groupId(path: string): FocusId {
  return `g:${path}`;
}

function occurrenceId(path: string, index: number): FocusId {
  return `o:${path}:${index}`;
}

export function BacklinksPanel(props: {
  result: BacklinkResult;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenOccurrence?: (path: string, line: number) => void | Promise<unknown>;
}) {
  const { result, loading, error, onRetry, onOpenOccurrence } = props;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<FocusId | null>(null);
  const itemRefs = useRef<Map<FocusId, HTMLButtonElement>>(new Map());

  const visibleIds = useMemo(() => {
    const ids: FocusId[] = [];
    for (const group of result.groups) {
      ids.push(groupId(group.sourcePath));
      if (!collapsed.has(group.sourcePath)) {
        group.occurrences.forEach((_, index) => {
          ids.push(occurrenceId(group.sourcePath, index));
        });
      }
    }
    return ids;
  }, [result.groups, collapsed]);

  const focusId = (id: FocusId) => {
    setActiveId(id);
    queueMicrotask(() => itemRefs.current.get(id)?.focus());
  };

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const move = (current: FocusId, delta: number) => {
    const index = visibleIds.indexOf(current);
    if (index < 0) return;
    const next = visibleIds[Math.max(0, Math.min(visibleIds.length - 1, index + delta))];
    if (next) focusId(next);
  };

  const onTreeKeyDown = (event: KeyboardEvent, id: FocusId, group: BacklinkGroup, occIndex?: number) => {
    const expanded = !collapsed.has(group.sourcePath);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(id, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(id, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (visibleIds[0]) focusId(visibleIds[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = visibleIds[visibleIds.length - 1];
      if (last) focusId(last);
    } else if (event.key === "ArrowRight" && occIndex == null) {
      event.preventDefault();
      if (!expanded) toggle(group.sourcePath);
      else if (group.occurrences.length > 0) focusId(occurrenceId(group.sourcePath, 0));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (occIndex != null) focusId(groupId(group.sourcePath));
      else if (expanded) toggle(group.sourcePath);
    } else if ((event.key === "Enter" || event.key === " ") && occIndex != null) {
      event.preventDefault();
      const occurrence = group.occurrences[occIndex];
      if (occurrence) void onOpenOccurrence?.(group.sourcePath, occurrence.line);
    }
  };

  const setRef = (id: FocusId) => (el: HTMLButtonElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  return (
    <section className="backlinks card outgoing-links" aria-labelledby="backlinks-title">
      <header>
        <h2 id="backlinks-title">Backlinks</h2>
        <span aria-label={backlinkCountLabel(result.documentCount, result.occurrenceCount)}>
          {backlinkCountLabel(result.documentCount, result.occurrenceCount)}
        </span>
      </header>

      {loading ? (
        <p className="outgoing-links-empty" role="status">
          Carregando backlinks…
        </p>
      ) : error ? (
        <div className="backlinks-error">
          <p className="outgoing-links-empty">{error}</p>
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Tentar de novo
            </Button>
          ) : null}
        </div>
      ) : result.groups.length === 0 ? (
        <p className="outgoing-links-empty">Nenhum backlink para este documento.</p>
      ) : (
        <ul className="backlinks-groups" role="tree" aria-label="Backlinks por documento">
          {result.groups.map((group) => {
            const expanded = !collapsed.has(group.sourcePath);
            const title = backlinkGroupTitle(group);
            const gid = groupId(group.sourcePath);
            const groupSelected = activeId === gid;
            return (
              <li key={group.sourcePath} className="backlinks-group" role="none">
                <button
                  ref={setRef(gid)}
                  type="button"
                  className="backlinks-group-toggle"
                  role="treeitem"
                  aria-expanded={expanded}
                  aria-selected={groupSelected}
                  tabIndex={groupSelected || (!activeId && gid === visibleIds[0]) ? 0 : -1}
                  onFocus={() => setActiveId(gid)}
                  onClick={() => toggle(group.sourcePath)}
                  onKeyDown={(event) => onTreeKeyDown(event, gid, group)}
                >
                  <span>{title}</span>
                  <small>
                    {group.occurrences.length === 1
                      ? "1 ocorrência"
                      : `${group.occurrences.length} ocorrências`}
                  </small>
                </button>
                {expanded ? (
                  <ul role="group" aria-label={`Ocorrências em ${title}`}>
                    {group.occurrences.map((occurrence, index) => {
                      const oid = occurrenceId(group.sourcePath, index);
                      const selected = activeId === oid;
                      return (
                        <li key={`${group.sourcePath}:${occurrence.line}:${index}`} role="none">
                          <button
                            ref={setRef(oid)}
                            type="button"
                            role="treeitem"
                            aria-selected={selected}
                            tabIndex={selected ? 0 : -1}
                            onFocus={() => setActiveId(oid)}
                            onClick={() => {
                              void onOpenOccurrence?.(group.sourcePath, occurrence.line);
                            }}
                            onKeyDown={(event) => onTreeKeyDown(event, oid, group, index)}
                            title={group.sourcePath}
                          >
                            <span>Linha {occurrence.line}</span>
                            {occurrence.context ? (
                              <small className="backlinks-context">{occurrence.context}</small>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
