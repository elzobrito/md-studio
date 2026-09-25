import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ToolingSettings } from "../../src/components/settings/ToolingSettings";

describe("Tooling Settings: painel informativo das ferramentas locais (MD-V03-022)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  });

  it("renderiza lista de formatadores locais sem bloquear o painel", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<ToolingSettings />);
    });

    expect(container.textContent).toContain("Formatadores e Ferramentas Locais");
    expect(container.textContent).toContain("Prettier");
    expect(container.textContent).toContain("Rustfmt");
    expect(container.textContent).toContain("Ruff");

    // Prettier deve aparecer como Disponível
    expect(container.textContent).toContain("Disponível");

    // Ferramentas ausentes aparecem como Indisponível
    expect(container.textContent).toContain("Indisponível");

    act(() => {
      root.unmount();
    });
  });

  it("botão de atualizar dispara discovery local sob demanda", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<ToolingSettings />);
    });

    const refreshBtn = container.querySelector<HTMLButtonElement>("button");
    expect(refreshBtn).not.toBeNull();
    expect(refreshBtn?.textContent).toContain("Atualizar");

    await act(async () => {
      refreshBtn?.click();
    });

    expect(container.textContent).toContain("Prettier");

    act(() => {
      root.unmount();
    });
  });

  it("a tela não persiste nada no localStorage nem altera defaults", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const root = createRoot(container);
    await act(async () => {
      root.render(<ToolingSettings />);
    });

    const refreshBtn = container.querySelector<HTMLButtonElement>("button");
    await act(async () => {
      refreshBtn?.click();
    });

    // Nenhuma gravação em localStorage permitida nesta tela
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();

    act(() => {
      root.unmount();
    });
  });
});
