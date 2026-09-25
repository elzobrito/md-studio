import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  doctorDiagnosticsField,
  doctorDecorationsField,
  setDoctorDiagnostics,
  mdDoctorExtension,
} from "../../src/editor/mdDoctorLinter";
import type { DoctorDiagnostic } from "../../src/types/metadata";

describe("MD-V03-012: MD Doctor CodeMirror Linter", () => {
  it("initializes with empty diagnostics and no decorations", () => {
    const state = EditorState.create({
      doc: "# Title\n\nSome text here\n",
      extensions: [mdDoctorExtension],
    });

    const diags = state.field(doctorDiagnosticsField);
    expect(diags).toEqual([]);

    const decos = state.field(doctorDecorationsField);
    expect(decos.size).toBe(0);
  });

  it("updates diagnostics and creates decorations when setDoctorDiagnostics is dispatched", () => {
    const state = EditorState.create({
      doc: "# Title\n\n[[broken-link]]\n\n![Missing](img/not-found.png)\n",
      extensions: [mdDoctorExtension],
    });

    const view = new EditorView({ state });

    const diagnostics: DoctorDiagnostic[] = [
      {
        rule: "broken-wiki-link",
        severity: "warning",
        message: "Wiki Link '[[broken-link]]' não encontrado no workspace",
        path: "test.md",
        line: 3,
        startCol: 0,
        endCol: 15,
        target: "broken-link",
      },
      {
        rule: "missing-asset",
        severity: "error",
        message: "Asset 'img/not-found.png' não foi encontrado no workspace",
        path: "test.md",
        line: 5,
        startCol: 0,
        endCol: 29,
        target: "img/not-found.png",
      },
    ];

    view.dispatch({
      effects: setDoctorDiagnostics.of(diagnostics),
    });

    const updatedDiags = view.state.field(doctorDiagnosticsField);
    expect(updatedDiags).toHaveLength(2);
    expect(updatedDiags[0].rule).toBe("broken-wiki-link");
    expect(updatedDiags[1].rule).toBe("missing-asset");

    const decos = view.state.field(doctorDecorationsField);
    expect(decos.size).toBe(2);

    view.destroy();
  });

  it("handles out of bounds diagnostic line gracefully", () => {
    const state = EditorState.create({
      doc: "# Short\n",
      extensions: [mdDoctorExtension],
    });

    const view = new EditorView({ state });

    const diagnostics: DoctorDiagnostic[] = [
      {
        rule: "broken-wiki-link",
        severity: "warning",
        message: "Out of bounds line",
        path: "test.md",
        line: 99,
        startCol: 0,
        endCol: 10,
      },
    ];

    view.dispatch({
      effects: setDoctorDiagnostics.of(diagnostics),
    });

    const decos = view.state.field(doctorDecorationsField);
    expect(decos.size).toBe(0);

    view.destroy();
  });
});
