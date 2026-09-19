export interface Template {
  id: string;
  label: string;
  description: string;
  icon: string;
  content: () => string;
}

export function today(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const blankTemplate: Template = {
  id: "blank",
  label: "Em branco",
  description: "Editor vazio",
  icon: "📄",
  content: () => "",
};

export const meetingTemplate: Template = {
  id: "meeting",
  label: "Reunião",
  description: "Pauta, participantes e ações",
  icon: "🤝",
  content: () => `# Reunião — ${today()}

**Participantes:**
- 

**Pauta:**
1. 
2. 
3. 

---

## Discussão

## Decisões

## Ações

| Ação | Responsável | Prazo |
| ---- | ----------- | ----- |
|      |             |       |
`,
};

export const reportTemplate: Template = {
  id: "report",
  label: "Relatório",
  description: "Sumário, contexto e conclusões",
  icon: "📊",
  content: () => `# Título do Relatório

**Data:** ${today()}
**Autor:** 

---

## Sumário Executivo

## Contexto

## Desenvolvimento

## Conclusões

## Próximos Passos
`,
};

export const notesTemplate: Template = {
  id: "notes",
  label: "Anotações",
  description: "Título, data e tópicos livres",
  icon: "📓",
  content: () => `# Anotações — ${today()}

**Fonte:** 

---

## Conceitos principais

## Exemplos

## Dúvidas

## Resumo pessoal
`,
};

export const specTemplate: Template = {
  id: "spec",
  label: "Especificação",
  description: "Objetivo, escopo e requisitos",
  icon: "📐",
  content: () => `# Especificação — Título

**Versão:** 1.0
**Data:** ${today()}
**Status:** Rascunho

---

## Objetivo

## Escopo

### Dentro do escopo

### Fora do escopo

## Requisitos

### Funcionais

### Não funcionais

## Solução proposta

## Riscos

## Critérios de Aceitação
`,
};

export const diaryTemplate: Template = {
  id: "diary",
  label: "Diário",
  description: "Data, reflexão e aprendizado",
  icon: "📔",
  content: () => `# ${today()}

**Como estou:** 

---

## O que aconteceu hoje

## O que aprendi

## O que quero melhorar

## Gratidão
`,
};

export const readmeTemplate: Template = {
  id: "readme",
  label: "README",
  description: "Projeto, instalação e uso",
  icon: "📦",
  content: () => `# Nome do Projeto

> Descrição curta do projeto.

## Instalação

\`\`\`bash
# comando de instalação
\`\`\`

## Uso

\`\`\`bash
# comando de uso
\`\`\`

## Funcionalidades

- 

## Contribuição

## Licença
`,
};

export const TEMPLATES: Template[] = [
  blankTemplate,
  meetingTemplate,
  reportTemplate,
  notesTemplate,
  specTemplate,
  diaryTemplate,
  readmeTemplate,
];

export function findFirstEditablePosition(content: string): number {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i > 0 && line.trim() === "") {
      return lines.slice(0, i).join("\n").length + 1;
    }
  }
  return content.length;
}
