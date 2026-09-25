import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MarkdownEditor } from "../../src/components/MarkdownEditor";
import { AppHeader } from "../../src/components/header/AppHeader";
import { SaveStatusBadge } from "../../src/components/statusbar/SaveStatus";
import { editorStore } from "../../src/state/editor";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UI-003: Single Save Command Consolidation", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    editorStore.setSaveStatus("saved");
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("ensures MarkdownEditor does NOT render an internal header or duplicate Save button", async () => {
    const root = createRoot(container);
    const onSave = vi.fn();

    await act(async () => {
      root.render(
        <MarkdownEditor
          value="# Test Title\nContent here"
          dirty={true}
          onChange={() => {}}
          onSave={onSave}
        />
      );
    });

    const editorSection = container.querySelector("section.editor");
    expect(editorSection).not.toBeNull();

    // Must not have an internal <header> element inside .editor
    const internalHeader = editorSection?.querySelector("header");
    expect(internalHeader).toBeNull();

    // Must not have any duplicate "Salvar" button inside .editor
    const buttons = Array.from(editorSection?.querySelectorAll("button") ?? []);
    const saveButtonInsideEditor = buttons.find((btn) => btn.textContent?.trim() === "Salvar");
    expect(saveButtonInsideEditor).toBeUndefined();

    // Must not have duplicate "Modificado" / "Salvo" text inside .editor
    expect(editorSection?.textContent).not.toContain("Modificado");

    act(() => {
      root.unmount();
    });
  });

  it("AppHeader provides the single explicit manual save action", async () => {
    const root = createRoot(container);
    const onSave = vi.fn();

    await act(async () => {
      root.render(
        <AppHeader
          viewMode="source"
          onViewModeChange={() => {}}
          leftOpen={true}
          rightOpen={true}
          onToggleLeft={() => {}}
          onToggleRight={() => {}}
          onSave={onSave}
          canSave={true}
          fileName="documento.md"
        />
      );
    });

    const saveButtons = container.querySelectorAll(".save-btn");
    expect(saveButtons.length).toBe(1);

    const saveBtn = saveButtons[0] as HTMLButtonElement;
    expect(saveBtn).not.toBeNull();
    expect(saveBtn.disabled).toBe(false);

    await act(async () => {
      saveBtn.click();
    });

    expect(onSave).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it("SaveStatusBadge reflects clean, dirty, saving, and error states accurately", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<SaveStatusBadge fileName="teste.md" />);
    });

    const badge = container.querySelector(".save-status-badge");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain("Salvo");
    expect(badge?.classList.contains("status-saved")).toBe(true);

    // Transition to dirty/modified
    await act(async () => {
      editorStore.setSaveStatus("modified");
    });
    expect(badge?.textContent).toContain("Modificado");
    expect(badge?.classList.contains("status-modified")).toBe(true);

    // Transition to saving
    await act(async () => {
      editorStore.setSaveStatus("saving");
    });
    expect(badge?.textContent).toContain("Salvando...");
    expect(badge?.classList.contains("status-saving")).toBe(true);

    // Transition to error
    await act(async () => {
      editorStore.setSaveStatus("error", "Disco cheio");
    });
    expect(badge?.textContent).toContain("Erro ao salvar");
    expect(badge?.getAttribute("title")).toBe("Disco cheio");
    expect(badge?.classList.contains("status-error")).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it("AppHeader SaveButton updates state dynamically from editorStore", async () => {
    const root = createRoot(container);
    const onSave = vi.fn();

    await act(async () => {
      root.render(
        <AppHeader
          viewMode="source"
          onViewModeChange={() => {}}
          leftOpen={true}
          rightOpen={true}
          onToggleLeft={() => {}}
          onToggleRight={() => {}}
          onSave={onSave}
          canSave={true}
          fileName="documento.md"
        />
      );
    });

    const saveBtn = container.querySelector(".save-btn") as HTMLButtonElement;
    expect(saveBtn.classList.contains("saved")).toBe(true);

    // Modify document
    await act(async () => {
      editorStore.setSaveStatus("modified");
    });
    expect(saveBtn.classList.contains("modified")).toBe(true);
    expect(saveBtn.disabled).toBe(false);

    // Saving in progress: button is disabled to prevent duplicate concurrent saves
    await act(async () => {
      editorStore.setSaveStatus("saving");
    });
    expect(saveBtn.classList.contains("saving")).toBe(true);
    expect(saveBtn.disabled).toBe(true);

    // Saved successfully: re-enabled
    await act(async () => {
      editorStore.setSaveStatus("saved");
    });
    expect(saveBtn.classList.contains("saved")).toBe(true);
    expect(saveBtn.disabled).toBe(false);

    act(() => {
      root.unmount();
    });
  });
});
