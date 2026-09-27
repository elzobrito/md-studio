import { useState, useMemo } from 'react';
import {
  type Annotation,
  CANONICAL_TODO_TAGS,
  filterAnnotations,
  groupAnnotations,
  countByTag,
} from '../../services/todoExplorer';
import '../../styles/todo-explorer.css';

export interface TodoExplorerProps {
  annotations: Annotation[];
  activePath?: string;
  onNavigate: (path: string, line: number, column: number) => void;
  customTags?: string[];
}

export function TodoExplorer({
  annotations,
  activePath,
  onNavigate,
  customTags = [],
}: TodoExplorerProps) {
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'file' | 'tag'>('file');

  const allAvailableTags = useMemo(() => {
    return Array.from(new Set([...CANONICAL_TODO_TAGS, ...customTags]));
  }, [customTags]);

  const tagCounts = useMemo(() => {
    return countByTag(annotations);
  }, [annotations]);

  const filteredAnnotations = useMemo(() => {
    return filterAnnotations(annotations, {
      tag: selectedTag === 'ALL' ? undefined : selectedTag,
      query: searchQuery,
    });
  }, [annotations, selectedTag, searchQuery]);

  const grouped = useMemo(() => {
    return groupAnnotations(filteredAnnotations, groupBy);
  }, [filteredAnnotations, groupBy]);

  const getTagClass = (tag: string) => {
    if (CANONICAL_TODO_TAGS.includes(tag as any)) {
      return `todo-tag-${tag}`;
    }
    return 'todo-tag-custom';
  };

  return (
    <div className="todo-explorer" aria-label="TODO Explorer">
      <div className="todo-header">
        <div className="todo-title-row">
          <div className="todo-title">
            <span>TODO Explorer</span>
            <span className="todo-total-badge" title="Total de anotações">
              {filteredAnnotations.length}
            </span>
          </div>
          <button
            type="button"
            className="todo-group-toggle-btn"
            onClick={() => setGroupBy((prev) => (prev === 'file' ? 'tag' : 'file'))}
            title={`Agrupar por ${groupBy === 'file' ? 'Tag' : 'Arquivo'}`}
          >
            {groupBy === 'file' ? '📁 Arquivo' : '🏷️ Tag'}
          </button>
        </div>

        <div className="todo-search-row">
          <input
            type="search"
            className="todo-search-input"
            placeholder="Filtrar TODOs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filtrar por texto"
          />
        </div>

        <div className="todo-filters-row">
          <button
            type="button"
            className={`todo-filter-chip${selectedTag === 'ALL' ? ' is-active' : ''}`}
            onClick={() => setSelectedTag('ALL')}
          >
            Todos <span className="todo-filter-badge">{annotations.length}</span>
          </button>
          {allAvailableTags.map((tag) => {
            const count = tagCounts[tag] || 0;
            return (
              <button
                key={tag}
                type="button"
                className={`todo-filter-chip${selectedTag === tag ? ' is-active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag} <span className="todo-filter-badge">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="todo-content" role="list">
        {grouped.length === 0 ? (
          <div className="todo-empty-state">
            <div className="todo-empty-icon" aria-hidden="true">✓</div>
            <div>Nenhuma anotação encontrada</div>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="todo-group">
              <div className="todo-group-header">
                <span className="todo-group-title" title={group.key}>
                  {groupBy === 'file' ? `📄 ${group.key.split('/').pop()}` : `🏷️ ${group.key}`}
                </span>
                <span className="todo-group-count">{group.count}</span>
              </div>
              {group.items.map((ann, idx) => {
                const isCurrentFile = activePath === ann.path;
                return (
                  <div
                    key={`${ann.path}-${ann.line}-${ann.column}-${idx}`}
                    className={`todo-item${isCurrentFile ? ' is-active-file' : ''}`}
                    onClick={() => onNavigate(ann.path, ann.line, ann.column)}
                    role="listitem"
                    title={`Ir para ${ann.path}:${ann.line}:${ann.column}`}
                  >
                    <span className={`todo-tag-badge ${getTagClass(ann.tag)}`}>
                      {ann.tag}
                    </span>
                    <div className="todo-item-body">
                      <div className="todo-item-text">
                        {ann.text || (
                          <span className="todo-item-empty-text">Sem descrição</span>
                        )}
                      </div>
                      <div className="todo-item-location">
                        {groupBy === 'tag' && (
                          <span className="todo-item-path" title={ann.path}>
                            {ann.path.split('/').pop()}
                          </span>
                        )}
                        <span className="todo-item-pos">
                          L{ann.line}:{ann.column}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
