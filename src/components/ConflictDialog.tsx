import "../styles/conflict-dialog.css";

export type ConflictChoice = "reload" | "keep" | "saveAs";

interface Props {
  relativePath: string;
  open: boolean;
  onChoose: (choice: ConflictChoice) => void;
}

/** Dirty buffer + external FS change — never silent overwrite. */
export function ConflictDialog({ relativePath, open, onChoose }: Props) {
  if (!open) return null;
  return (
    <div className="conflict-backdrop" role="presentation">
      <div
        className="conflict-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-desc"
      >
        <h2 id="conflict-title">Conflito com alteração externa</h2>
        <p id="conflict-desc">
          O arquivo <code>{relativePath}</code> mudou no disco enquanto há edições locais não
          salvas. Escolha como resolver — nada será sobrescrito em silêncio.
        </p>
        <div className="conflict-actions">
          <button type="button" className="conflict-btn danger" onClick={() => onChoose("reload")}>
            Recarregar do disco
          </button>
          <button type="button" className="conflict-btn" onClick={() => onChoose("keep")}>
            Manter minha edição
          </button>
          <button type="button" className="conflict-btn primary" onClick={() => onChoose("saveAs")}>
            Salvar como…
          </button>
        </div>
      </div>
    </div>
  );
}
