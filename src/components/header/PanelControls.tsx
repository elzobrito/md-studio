interface Props {
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function PanelControls({
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
}: Props) {
  return (
    <div className="panel-controls" role="group" aria-label="Controle de painéis">
      <button
        type="button"
        className={`panel-toggle-btn${leftOpen ? " is-active" : ""}`}
        onClick={onToggleLeft}
        title={`Alternar barra lateral esquerda (Ctrl+\\)`}
        aria-label="Alternar barra lateral esquerda"
        aria-pressed={leftOpen}
      >
        ≡
      </button>
      <button
        type="button"
        className={`panel-toggle-btn${rightOpen ? " is-active" : ""}`}
        onClick={onToggleRight}
        title={`Alternar barra lateral direita (Ctrl+Shift+\\)`}
        aria-label="Alternar barra lateral direita"
        aria-pressed={rightOpen}
      >
        ☰
      </button>
    </div>
  );
}
