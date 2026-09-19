import type { EditorView } from "@codemirror/view";
import {
  insertWikiCompletion,
  type WikiCompletionState,
} from "../../editor/wiki/wiki-completion";

export function WikiCompletionMenu(props: {
  view: EditorView | null;
  state: WikiCompletionState | null;
  onClose: () => void;
}) {
  if (!props.state) return null;
  return (
    <div className="wiki-completion-menu" role="listbox" aria-label="Completar wiki link">
      {props.state.items.map((item, index) => (
        <button
          key={`${item.target}:${item.detail}`}
          type="button"
          role="option"
          aria-selected={index === props.state?.selected}
          className={index === props.state?.selected ? "is-selected" : ""}
          onMouseDown={(event) => {
            event.preventDefault();
            if (props.view && props.state) insertWikiCompletion(props.view, props.state, item);
            props.onClose();
          }}
        >
          <strong>{item.label}</strong>
          <small>{item.detail}</small>
        </button>
      ))}
    </div>
  );
}
