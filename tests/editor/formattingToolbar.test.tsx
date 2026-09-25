import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { FormattingToolbar } from "../../src/components/editor/FormattingToolbar";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UI-008: FormattingToolbar escalável", () => {
  let container: HTMLDivElement;
  let viewContainer: HTMLDivElement;
  let view: EditorView;

  beforeEach(() => {
    container = document.createElement("div");
    viewContainer = document.createElement("div");
    document.body.appendChild(container);
    document.body.appendChild(viewContainer);

    const state = EditorState.create({
      doc: "Hello World\nLine 2",
      extensions: [markdown()],
      selection: { anchor: 0, head: 5 },
    });
    view = new EditorView({ state, parent: viewContainer });
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    if (viewContainer.parentNode) {
      viewContainer.parentNode.removeChild(viewContainer);
    }
  });

  it("renders nothing if view is null", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<FormattingToolbar view={null} />);
    });

    expect(container.innerHTML).toBe("");
    act(() => {
      root.unmount();
    });
  });

  it("renders compact functional groups and '+ Inserir' menu button", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<FormattingToolbar view={view} />);
    });

    const toolbar = container.querySelector(".formatting-toolbar");
    expect(toolbar).not.toBeNull();
    expect(toolbar?.getAttribute("role")).toBe("toolbar");

    // Check headings
    const h1Btn = container.querySelector('button[aria-label="Título nível 1"]');
    const h2Btn = container.querySelector('button[aria-label="Título nível 2"]');
    const h3Btn = container.querySelector('button[aria-label="Título nível 3"]');
    expect(h1Btn).not.toBeNull();
    expect(h2Btn).not.toBeNull();
    expect(h3Btn).not.toBeNull();

    // Check inline formatting
    const boldBtn = container.querySelector('button[aria-label="Negrito"]');
    const italicBtn = container.querySelector('button[aria-label="Itálico"]');
    const strikeBtn = container.querySelector('button[aria-label="Tachado"]');
    expect(boldBtn).not.toBeNull();
    expect(italicBtn).not.toBeNull();
    expect(strikeBtn).not.toBeNull();

    // Check links and code
    const linkBtn = container.querySelector('button[aria-label="Link"]');
    const imgBtn = container.querySelector('button[aria-label="Imagem"]');
    const codeBtn = container.querySelector('button[aria-label="Código inline"]');
    const codeBlockBtn = container.querySelector('button[aria-label="Bloco de código"]');
    expect(linkBtn).not.toBeNull();
    expect(imgBtn).not.toBeNull();
    expect(codeBtn).not.toBeNull();
    expect(codeBlockBtn).not.toBeNull();

    // Check "+ Inserir" dropdown trigger
    const insertBtn = container.querySelector<HTMLButtonElement>(".toolbar-insert-btn");
    expect(insertBtn).not.toBeNull();
    expect(insertBtn?.textContent).toContain("+ Inserir");
    expect(insertBtn?.getAttribute("aria-haspopup")).toBe("menu");
    expect(insertBtn?.getAttribute("aria-expanded")).toBe("false");

    // Insert menu is hidden initially
    const menu = container.querySelector<HTMLUListElement>(".toolbar-insert-menu");
    expect(menu).not.toBeNull();
    expect(menu?.hidden).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it("triggers one-click formatting actions on the CodeMirror document", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<FormattingToolbar view={view} />);
    });

    const boldBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Negrito"]')!;
    expect(boldBtn).not.toBeNull();

    await act(async () => {
      boldBtn.click();
    });

    // Initial doc had "Hello" selected from 0 to 5. Bold wraps it in **Hello**
    expect(view.state.doc.toString()).toContain("**Hello**");

    act(() => {
      root.unmount();
    });
  });

  it("triggers contextual document or code formatting when clicking format code button", async () => {
    // Set document with an unformatted markdown table
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: "# Header\n\n| a | b |\n|---|---|\n| 1 | 2 |\n",
      },
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(<FormattingToolbar view={view} />);
    });

    const formatBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Formatar código"]')!;
    expect(formatBtn).not.toBeNull();

    await act(async () => {
      formatBtn.click();
    });

    expect(view.state.doc.toString()).toContain("| a   | b   |");

    act(() => {
      root.unmount();
    });
  });

  it("opens and closes '+ Inserir' menu, displaying options and triggering structural inserts", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<FormattingToolbar view={view} />);
    });

    const insertBtn = container.querySelector<HTMLButtonElement>(".toolbar-insert-btn")!;
    const menu = container.querySelector<HTMLUListElement>(".toolbar-insert-menu")!;

    // Open menu
    await act(async () => {
      insertBtn.click();
    });

    expect(insertBtn.getAttribute("aria-expanded")).toBe("true");
    expect(menu.hidden).toBe(false);

    const menuItems = container.querySelectorAll<HTMLButtonElement>(".toolbar-insert-item");
    expect(menuItems.length).toBe(7);

    const labels = Array.from(menuItems).map((i) => i.textContent || "");
    expect(labels.some((l) => l.includes("Tabela"))).toBe(true);
    expect(labels.some((l) => l.includes("Lista de tópicos"))).toBe(true);
    expect(labels.some((l) => l.includes("Lista numerada"))).toBe(true);
    expect(labels.some((l) => l.includes("Lista de tarefas"))).toBe(true);
    expect(labels.some((l) => l.includes("Citação"))).toBe(true);
    expect(labels.some((l) => l.includes("Linha divisória"))).toBe(true);
    expect(labels.some((l) => l.includes("Novo de modelo..."))).toBe(true);

    // Click divider item
    const dividerItem = Array.from(menuItems).find((i) => i.textContent?.includes("Linha divisória"))!;
    await act(async () => {
      dividerItem.click();
    });

    // Menu should be closed
    expect(insertBtn.getAttribute("aria-expanded")).toBe("false");
    expect(menu.hidden).toBe(true);

    // Document should now contain divider '---'
    expect(view.state.doc.toString()).toContain("---");

    act(() => {
      root.unmount();
    });
  });

  it("supports keyboard navigation inside the insert menu", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<FormattingToolbar view={view} />);
    });

    const insertBtn = container.querySelector<HTMLButtonElement>(".toolbar-insert-btn")!;

    // Open with ArrowDown
    await act(async () => {
      insertBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(insertBtn.getAttribute("aria-expanded")).toBe("true");

    const menuItems = container.querySelectorAll<HTMLButtonElement>(".toolbar-insert-item");

    // Close with Escape on item
    await act(async () => {
      menuItems[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(insertBtn.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("closes the insert menu on click outside", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<FormattingToolbar view={view} />);
    });

    const insertBtn = container.querySelector<HTMLButtonElement>(".toolbar-insert-btn")!;
    await act(async () => {
      insertBtn.click();
    });
    expect(insertBtn.getAttribute("aria-expanded")).toBe("true");

    // Click outside
    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(insertBtn.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });
});
