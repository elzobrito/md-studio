ONDA 0B — Guided Markdown | MD-GM-004
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-004)
Executor: outro agente. Cadastrado no ESAA para execução externa.

PATHS REAIS DO REPO (remap obrigatório vs WBS):
- Editor: src/components/MarkdownEditor.tsx
- Preferir criar sob: src/components/editor/, src/editor/formatting|slash|paste|hints|table/, src/styles/
- App modos: source | preview | split — toolbar/hints só em source e split
- Não quebrar Onda 0 (vitest 40), MD-FOUNDATION-*, MDS-PROD-OPEN-FILE-001, watcher, export HTML

PRINCÍPIOS: GM-P1 não esconder MD; GM-P2 progressivo; GM-P3 contextual; GM-P4 não destrutivo; GM-P5 compatível CM6.
FORA DE ESCOPO: WYSIWYG, docx/odt, cloud, collab, criar/apagar arquivo via toolbar.

---
CONTEÚDO WBS COMPLETO:
# WBS-GM-004

# Document Templates

Módulo origem: Módulo 4
Prioridade: ALTA
Sprint: GM-C
Depende de: WBS-GM-001 (botão ➕ na toolbar)

---

## Contexto

Ao criar um novo documento (Ctrl+N), o usuário pode
escolher um template como ponto de partida.

---

## WBS-GM-004.01

Subtarefa: Definir templates em TypeScript

Artefato:

```
src/templates/index.ts          [CRIAR]
src/templates/blank.ts          [CRIAR]
src/templates/meeting.ts        [CRIAR]
src/templates/report.ts         [CRIAR]
src/templates/notes.ts          [CRIAR]
src/templates/spec.ts           [CRIAR]
src/templates/diary.ts          [CRIAR]
src/templates/readme.ts         [CRIAR]
```

Interface base:

```typescript
export interface Template {
  id: string;
  label: string;
  description: string;
  icon: string;
  content: () => string;  // função para suportar datas dinâmicas
}
```

Função auxiliar de data:

```typescript
function today(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
```

Conteúdo de meeting.ts:

```typescript
export const meetingTemplate: Template = {
  id: 'meeting',
  label: 'Reunião',
  description: 'Pauta, participantes e ações',
  icon: '🤝',
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
`
};
```

Conteúdo de report.ts:

```typescript
export const reportTemplate: Template = {
  id: 'report',
  label: 'Relatório',
  description: 'Sumário, contexto e conclusões',
  icon: '📊',
  content: () => `# Título do Relatório

**Data:** ${today()}
**Autor:** 

---

## Sumário Executivo

## Contexto

## Desenvolvimento

## Conclusões

## Próximos Passos
`
};
```

Conteúdo de notes.ts:

```typescript
export const notesTemplate: Template = {
  id: 'notes',
  label: 'Anotações',
  description: 'Título, data e tópicos livres',
  icon: '📓',
  content: () => `# Anotações — ${today()}

**Fonte:** 

---

## Conceitos principais

## Exemplos

## Dúvidas

## Resumo pessoal
`
};
```

Conteúdo de spec.ts:

```typescript
export const specTemplate: Template = {
  id: 'spec',
  label: 'Especificação',
  description: 'Objetivo, escopo e requisitos',
  icon: '📐',
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
`
};
```

Conteúdo de diary.ts:

```typescript
export const diaryTemplate: Template = {
  id: 'diary',
  label: 'Diário',
  description: 'Data, reflexão e aprendizado',
  icon: '📔',
  content: () => `# ${today()}

**Como estou:** 

---

## O que aconteceu hoje

## O que aprendi

## O que quero melhorar

## Gratidão
`
};
```

Conteúdo de readme.ts:

```typescript
export const readmeTemplate: Template = {
  id: 'readme',
  label: 'README',
  description: 'Projeto, instalação e uso',
  icon: '📦',
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
`
};
```

---

## WBS-GM-004.02

Subtarefa: Implementar TemplateCard

Artefato:

```
src/components/editor/TemplateCard.tsx   [CRIAR]
```

Visual:

```
┌────────────────────────────────────┐
│  🤝  Reunião                       │
│      Pauta, participantes e ações  │
└────────────────────────────────────┘
```

Props:

```typescript
interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onClick: () => void;
}
```

---

## WBS-GM-004.03

Subtarefa: Implementar NewDocumentModal

Artefato:

```
src/components/editor/NewDocumentModal.tsx   [CRIAR]
src/styles/new-document-modal.css           [CRIAR]
```

Layout:

```
┌────────────────────────────────────────────────────────────┐
│  Novo Documento                                     [✕]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 📄           │  │ 🤝           │  │ 📊           │     │
│  │ Em branco    │  │ Reunião      │  │ Relatório    │     │
│  │ Editor vazio │  │ Pauta e atas │  │ Com sumário  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 📓           │  │ 📐           │  │ 📔           │     │
│  │ Anotações    │  │ Especificação│  │ Diário       │     │
│  │ Tópicos livr │  │ Requisitos   │  │ Reflexão     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  ┌──────────────┐                                         │
│  │ 📦           │                                         │
│  │ README       │                                         │
│  │ Proj e uso   │                                         │
│  └──────────────┘                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Comportamento:

```
Click em template   → fecha modal e abre editor com conteúdo
Click em "Em branco"→ fecha modal e abre editor vazio
ESC ou [✕]          → fecha modal sem criar nada
```

---

## WBS-GM-004.04

Subtarefa: Posicionar cursor no primeiro campo editável

Após carregar o template, posicionar o cursor na primeira
linha editável (não na linha de título, mas no primeiro
campo vazio).

```typescript
function findFirstEditablePosition(content: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Linha vazia após o primeiro heading
    if (i > 0 && line.trim() === '') {
      return lines.slice(0, i).join('\n').length + 1;
    }
  }
  return content.length;
}
```

---

## WBS-GM-004.05

Subtarefa: Integrar NewDocumentModal no fluxo Ctrl+N

Artefato:

```
src/App.tsx                              [MODIFICAR]
src/hooks/useKeyboardShortcuts.ts        [MODIFICAR]
```

Comportamento atual de Ctrl+N:

```
Abre editor vazio imediatamente
```

Comportamento alvo:

```
Ctrl+N → abre NewDocumentModal
         → usuário escolhe template
         → editor abre com conteúdo
```

---

## Critérios de Aceitação — WBS-GM-004

```
[ ] Ctrl+N abre o modal de seleção de template
[ ] Todos os 7 templates listados com ícone e descrição
[ ] "Em branco" abre editor vazio (comportamento anterior preservado)
[ ] Template "Reunião" inserido corretamente com data atual
[ ] Template "Relatório" inserido corretamente
[ ] Template "Anotações" inserido corretamente
[ ] Template "Especificação" inserido corretamente
[ ] Template "Diário" inserido com data atual
[ ] Template "README" inserido corretamente
[ ] {{data}} substituída pela data atual em pt-BR
[ ] Cursor posicionado no primeiro campo editável
[ ] ESC fecha sem criar documento
[ ] [✕] fecha sem criar documento
```

Verify: `document_templates_pass`

---