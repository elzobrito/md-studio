import { useState } from "react";
import type { RecoverableDraft } from "../lib/drafts/recovery";
import { removeDraftKey } from "../lib/drafts/recovery";
import "../styles/conflict-dialog.css";

interface Props {
  drafts: RecoverableDraft[];
  onClose: (selectedKey: string) => void;
  onChange: () => void;
}

/** Legacy keys cannot be tied to a workspace after a restart. Never auto-open them. */
export function DraftRecoveryDialog({ drafts, onClose, onChange }: Props) {
  const [selectedKey, setSelectedKey] = useState(drafts[0]?.key ?? "");
  const selected = drafts.find((draft) => draft.key === selectedKey) ?? drafts[0];
  if (!selected) return null;

  const exportDraft = () => {
    const blob = new Blob([selected.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (selected.relativePath.split("/").pop() || "rascunho.md").replace(/[^a-zA-Z0-9._-]/g, "_");
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const remove = () => {
    if (!removeDraftKey(selected.key)) {
      window.alert("Não foi possível excluir o rascunho do armazenamento local.");
      return;
    }
    onChange();
  };

  return (
    <div className="conflict-backdrop" role="presentation">
      <div className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="draft-recovery-title">
        <h2 id="draft-recovery-title">Rascunhos locais para revisar</h2>
        <p>
          Rascunhos não salvos ficam neste dispositivo por até 90 dias. Os antigos sem pasta identificável
          não são abertos automaticamente para evitar conteúdo da pasta errada.
        </p>
        <label htmlFor="draft-recovery-select">Rascunho</label>
        <select id="draft-recovery-select" value={selected.key} onChange={(event) => setSelectedKey(event.target.value)}>
          {drafts.map((draft) => (
            <option key={draft.key} value={draft.key}>
              {draft.relativePath || "Arquivo desconhecido"} — {draft.legacy ? "origem antiga" : draft.expired ? "prazo encerrado" : draft.browserSession ? "sessão do navegador" : "vence em breve"}
            </option>
          ))}
        </select>
        <p>
          Última edição: {new Date(selected.savedAt).toLocaleString("pt-BR")}. {selected.expired
            ? "Última chance: exporte agora; ao fechar, este rascunho expirado será excluído."
            : selected.legacy || selected.browserSession
              ? "A pasta original não pode ser confirmada. Inspecione e exporte manualmente."
              : "Exporte ou salve seu trabalho antes de completar 90 dias."}
        </p>
        <pre style={{ maxHeight: "12rem", overflow: "auto", whiteSpace: "pre-wrap" }}>
          {selected.content.slice(0, 4000)}{selected.content.length > 4000 ? "\n… (prévia limitada; exportação completa)" : ""}
        </pre>
        <div className="conflict-actions">
          <button type="button" className="conflict-btn primary" onClick={exportDraft}>Exportar .md</button>
          <button type="button" className="conflict-btn danger" onClick={remove}>Excluir</button>
          <button type="button" className="conflict-btn" onClick={() => {
            const firstExpired = drafts.find((draft) => draft.expired);
            if (firstExpired && !selected.expired) {
              setSelectedKey(firstExpired.key);
            } else {
              onClose(selected.key);
            }
          }}>{drafts.some((draft) => draft.expired) ? "Revisar prazo / fechar" : "Fechar"}</button>
        </div>
      </div>
    </div>
  );
}
