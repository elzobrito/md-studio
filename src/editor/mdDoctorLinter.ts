import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, hoverTooltip, type DecorationSet, type Tooltip } from "@codemirror/view";
import type { DoctorDiagnostic } from "../types/metadata";
import { getDoctorDiagnostics } from "../lib/ipc/metadata";

export const setDoctorDiagnostics = StateEffect.define<DoctorDiagnostic[]>();

const errorMark = Decoration.mark({ class: "cm-doctor-diagnostic cm-doctor-error" });
const warningMark = Decoration.mark({ class: "cm-doctor-diagnostic cm-doctor-warning" });
const infoMark = Decoration.mark({ class: "cm-doctor-diagnostic cm-doctor-info" });

export const doctorDiagnosticsField = StateField.define<DoctorDiagnostic[]>({
  create() {
    return [];
  },
  update(diagnostics, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDoctorDiagnostics)) {
        return effect.value;
      }
    }
    return diagnostics;
  },
});

export const doctorDecorationsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    const diags = tr.state.field(doctorDiagnosticsField, false);
    if (!diags || diags.length === 0) {
      return Decoration.none;
    }

    const doc = tr.state.doc;
    const ranges: { from: number; to: number; mark: any }[] = [];

    for (const diag of diags) {
      if (diag.line < 1 || diag.line > doc.lines) continue;
      const line = doc.line(diag.line);
      const from = Math.min(line.from + (diag.startCol || 0), line.to);
      const to = Math.max(from + 1, Math.min(line.from + (diag.endCol || line.length), line.to));

      const mark =
        diag.severity === "error"
          ? errorMark
          : diag.severity === "warning"
          ? warningMark
          : infoMark;

      ranges.push({ from, to, mark });
    }

    // Sort by from asc, to asc
    ranges.sort((a, b) => a.from - b.from || a.to - b.to);

    // Merge or dedup if overlapping
    const decoList = ranges.map((r) => r.mark.range(r.from, r.to));
    return Decoration.set(decoList, true);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const doctorTooltipExtension = hoverTooltip(
  (view, pos) => {
    const diags = view.state.field(doctorDiagnosticsField, false);
    if (!diags || diags.length === 0) return null;

    const line = view.state.doc.lineAt(pos);
    const lineNo = line.number;

    const matching = diags.filter((d) => d.line === lineNo);
    if (matching.length === 0) return null;

    return {
      pos: line.from,
      end: line.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-doctor-tooltip";

        for (const diag of matching) {
          const item = document.createElement("div");
          item.className = `cm-doctor-tooltip-item severity-${diag.severity}`;

          const header = document.createElement("div");
          header.className = "cm-doctor-item-header";
          const icon = diag.severity === "error" ? "❌" : diag.severity === "warning" ? "⚠️" : "ℹ️";
          header.textContent = `${icon} [${diag.rule}]`;
          item.appendChild(header);

          const msg = document.createElement("div");
          msg.className = "cm-doctor-item-msg";
          msg.textContent = diag.message;
          item.appendChild(msg);

          if (diag.quickFix) {
            const fix = diag.quickFix;
            const fixBtn = document.createElement("button");
            fixBtn.className = "cm-doctor-quick-fix-btn";
            fixBtn.textContent = `Corrigir: ${fix.label}`;
            fixBtn.onclick = (e) => {
              e.preventDefault();
              const targetLine = view.state.doc.line(fix.line);
              view.dispatch({
                changes: {
                  from: targetLine.from + fix.startCol,
                  to: targetLine.from + fix.endCol,
                  insert: fix.replacement,
                },
              });
            };
            item.appendChild(fixBtn);
          }

          dom.appendChild(item);
        }

        return { dom };
      },
    } as Tooltip;
  },
  { hoverTime: 300 }
);

export const doctorTheme = EditorView.theme({
  ".cm-doctor-diagnostic": {
    textDecoration: "underline wavy",
    textUnderlineOffset: "3px",
  },
  ".cm-doctor-error": {
    textDecorationColor: "var(--danger, #f38ba8)",
  },
  ".cm-doctor-warning": {
    textDecorationColor: "var(--warning, #fab387)",
  },
  ".cm-doctor-info": {
    textDecorationColor: "var(--info, #89b4fa)",
  },
  ".cm-doctor-tooltip": {
    backgroundColor: "var(--bg-secondary, #1e1e2e)",
    color: "var(--text-primary, #cdd6f4)",
    border: "1px solid var(--border-soft, #45475a)",
    borderRadius: "6px",
    padding: "8px 12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    fontSize: "12px",
    maxWidth: "360px",
    zIndex: "100",
  },
  ".cm-doctor-tooltip-item": {
    marginBottom: "6px",
  },
  ".cm-doctor-item-header": {
    fontWeight: "bold",
    marginBottom: "2px",
  },
  ".cm-doctor-item-msg": {
    opacity: "0.9",
  },
  ".cm-doctor-quick-fix-btn": {
    marginTop: "4px",
    padding: "2px 8px",
    fontSize: "11px",
    backgroundColor: "var(--accent, #b4befe)",
    color: "var(--bg-primary, #11111b)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
});

export const mdDoctorExtension: Extension = [
  doctorDiagnosticsField,
  doctorDecorationsField,
  doctorTooltipExtension,
  doctorTheme,
];
