import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  blankTemplate,
  meetingTemplate,
  reportTemplate,
  notesTemplate,
  specTemplate,
  diaryTemplate,
  readmeTemplate,
  today,
  findFirstEditablePosition,
} from "../../src/templates";

describe("Document Templates", () => {
  it("includes all required templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(7);
    const ids = TEMPLATES.map((t) => t.id);
    expect(ids).toContain("blank");
    expect(ids).toContain("meeting");
    expect(ids).toContain("report");
    expect(ids).toContain("notes");
    expect(ids).toContain("spec");
    expect(ids).toContain("diary");
    expect(ids).toContain("readme");
  });

  it("today() generates valid pt-BR date format", () => {
    const d = today();
    expect(d).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("meetingTemplate contains participants, agenda and current date", () => {
    const content = meetingTemplate.content();
    expect(content).toContain(`Reunião — ${today()}`);
    expect(content).toContain("Participantes:");
    expect(content).toContain("Pauta:");
  });

  it("reportTemplate contains executive summary and date", () => {
    const content = reportTemplate.content();
    expect(content).toContain("Título do Relatório");
    expect(content).toContain(`Data:** ${today()}`);
    expect(content).toContain("Sumário Executivo");
  });

  it("notesTemplate contains notes header and date", () => {
    const content = notesTemplate.content();
    expect(content).toContain(`Anotações — ${today()}`);
    expect(content).toContain("Conceitos principais");
  });

  it("specTemplate contains specification structure", () => {
    const content = specTemplate.content();
    expect(content).toContain("Especificação — Título");
    expect(content).toContain("Escopo");
    expect(content).toContain("Requisitos");
  });

  it("diaryTemplate contains diary questions and date", () => {
    const content = diaryTemplate.content();
    expect(content).toContain(`# ${today()}`);
    expect(content).toContain("Como estou:");
  });

  it("readmeTemplate contains project markdown structure", () => {
    const content = readmeTemplate.content();
    expect(content).toContain("Nome do Projeto");
    expect(content).toContain("## Instalação");
    expect(content).toContain("## Uso");
  });

  it("blankTemplate returns empty string", () => {
    expect(blankTemplate.content()).toBe("");
  });

  it("findFirstEditablePosition returns first empty line after heading", () => {
    const content = "# Título\n\nTexto inicial";
    const pos = findFirstEditablePosition(content);
    expect(pos).toBe(9); // after "# Título\n"
  });
});
