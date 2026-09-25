import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { DocumentOutline } from "../../src/components/DocumentOutline";
import { extractOutline, scrollToHeading } from "../../src/services/navigation";

describe("Outline hierárquico, filtrável e sincronizado ao heading atual (MD-V03-023)", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  const sampleMarkdown = [
    "# Título Principal",
    "Texto...",
    "## Seção 1",
    "Texto...",
    "### Subseção 1.1",
    "Texto...",
    "#### Detalhe Profundo 1.1.1",
    "Texto...",
    "## Seção Repetida",
    "Texto inicial...",
    "## Seção Repetida",
    "Texto repetido...",
    "# Conclusão",
  ].join("\n");

  it("extractOutline: diferencia headings duplicados com slugs únicos e linhas distintas", () => {
    const items = extractOutline(sampleMarkdown);

    const dupes = items.filter((it) => it.text === "Seção Repetida");
    expect(dupes.length).toBe(2);

    // Primeiro heading repetido
    expect(dupes[0].id).toBe("secao-repetida");
    expect(dupes[0].line).toBe(9);

    // Segundo heading repetido
    expect(dupes[1].id).toBe("secao-repetida-1");
    expect(dupes[1].line).toBe(11);
  });

  it("scrollToHeading: aceita slug ou line para navegação precisa", () => {
    const container = document.createElement("div");
    const h2_first = document.createElement("h2");
    h2_first.id = "user-content-secao-repetida";
    h2_first.setAttribute("data-source-line", "9");
    h2_first.scrollIntoView = vi.fn();

    const h2_second = document.createElement("h2");
    h2_second.id = "user-content-secao-repetida-1";
    h2_second.setAttribute("data-source-line", "11");
    h2_second.scrollIntoView = vi.fn();

    container.appendChild(h2_first);
    container.appendChild(h2_second);

    // Navegar para o primeiro
    const ok1 = scrollToHeading("secao-repetida", container, 9);
    expect(ok1).toBe(true);
    expect(h2_first.scrollIntoView).toHaveBeenCalled();

    // Navegar para o segundo
    const ok2 = scrollToHeading("secao-repetida-1", container, 11);
    expect(ok2).toBe(true);
    expect(h2_second.scrollIntoView).toHaveBeenCalled();
  });

  it("filtra por profundidade (H1, H2, H3, Todos)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DocumentOutline content={sampleMarkdown} onNavigate={() => {}} />);
    });

    // Padrão: todos (7 headings)
    expect(container.querySelectorAll(".outline-item").length).toBe(7);

    // Clicar em H1
    const h1Btn = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent === "H1"
    );
    expect(h1Btn).toBeDefined();

    await act(async () => {
      h1Btn?.click();
    });

    // Apenas os 2 H1 devem aparecer
    expect(container.querySelectorAll(".outline-item").length).toBe(2);

    // Clicar em H2
    const h2Btn = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent === "H2"
    );
    await act(async () => {
      h2Btn?.click();
    });

    // H1 (2) + H2 (3) = 5 headings
    expect(container.querySelectorAll(".outline-item").length).toBe(5);

    act(() => {
      root.unmount();
      document.body.removeChild(container);
    });
  });

  it("sincroniza o heading ativo com cursorLine", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    // Cursor na linha 10 (dentro de 'Seção Repetida' linha 9)
    await act(async () => {
      root.render(
        <DocumentOutline content={sampleMarkdown} onNavigate={() => {}} cursorLine={10} />
      );
    });

    const activeItem = container.querySelector(".outline-item.is-active");
    expect(activeItem).not.toBeNull();
    expect(activeItem?.textContent).toContain("Seção Repetida");

    act(() => {
      root.unmount();
      document.body.removeChild(container);
    });
  });
});
