import { describe, expect, it } from "vitest";
import { segmentMarkdown } from "../../src/presentation/segmentation";

const instrucao = `# INSTRUCAO-HOTFIX-THEME-V2.3

Este parágrafo introdutório precisa permanecer visível no mesmo slide do título.

## 3. Impacto cruzado

A tabela abaixo é o critério visual do modo claro.

| Superfície | Token |
| --- | --- |
| Fundo do slide | --slide-bg |

- Item de lista que não pode sumir abaixo do heading.

Parágrafo final do slide de impacto.
`;

const hotfix = `# MD Studio — Hotfix de Tema e Presentation Mode

O corpo deste documento começa imediatamente depois do título.

- alpha
- beta

O último parágrafo confirma que o slide não terminou no heading.
`;

describe("MD-DS-005 segmentação dos documentos de reprodução", () => {
  it("mantém heading e corpo nos slides", () => {
    const first = segmentMarkdown(instrucao);
    expect(first.documentTitle).toBe("INSTRUCAO-HOTFIX-THEME-V2.3");
    expect(first.segments).toHaveLength(2);
    expect(first.segments[0]?.markdown).toContain("parágrafo introdutório");
    expect(first.segments[1]?.title).toBe("3. Impacto cruzado");
    expect(first.segments[1]?.markdown).toContain("Item de lista");
    expect(first.segments[1]?.markdown).toContain("Parágrafo final");

    const second = segmentMarkdown(hotfix);
    expect(second.documentTitle).toBe("MD Studio — Hotfix de Tema e Presentation Mode");
    expect(second.segments).toHaveLength(1);
    expect(second.segments[0]?.markdown).toContain("O corpo deste documento");
    expect(second.segments[0]?.markdown).toContain("não terminou no heading");
  });
});
