ONDA 0B — Guided Markdown | MD-GM-003
Fonte WBS: WBS-ONDA-0B-GUIDED-MARKDOWN v2.0 (WBS-GM-003)
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
# WBS-GM-003

# Smart Paste

Módulo origem: Módulo 3
Prioridade: ALTA
Sprint: GM-B
Depende de: nenhuma

---

## Contexto

Ao colar conteúdo copiado de um site, Google Docs, Word ou
e-mail, o app converte automaticamente HTML → Markdown.

---

## WBS-GM-003.01

Subtarefa: Implementar conversor HTML → Markdown

Artefato:

```
src/editor/paste/html-to-md.ts   [CRIAR]
```

Tabela de conversão obrigatória:

```typescript
// Mapeamento de regras de conversão
const CONVERSION_RULES: ConversionRule[] = [
  { tag: 'h1', handler: (text) => `# ${text}\n\n` },
  { tag: 'h2', handler: (text) => `## ${text}\n\n` },
  { tag: 'h3', handler: (text) => `### ${text}\n\n` },
  { tag: 'h4', handler: (text) => `#### ${text}\n\n` },
  { tag: 'h5', handler: (text) => `##### ${text}\n\n` },
  { tag: 'h6', handler: (text) => `###### ${text}\n\n` },
  { tag: 'strong', handler: (text) => `**${text}**` },
  { tag: 'b',      handler: (text) => `**${text}**` },
  { tag: 'em',     handler: (text) => `_${text}_` },
  { tag: 'i',      handler: (text) => `_${text}_` },
  { tag: 'del',    handler: (text) => `~~${text}~~` },
  { tag: 's',      handler: (text) => `~~${text}~~` },
  { tag: 'code',   handler: (text) => `\`${text}\`` },
  { tag: 'a',      handler: (text, el) => `[${text}](${el.href})` },
  { tag: 'img',    handler: (_, el) => `![${el.alt}](${el.src})` },
  { tag: 'hr',     handler: () => `---\n\n` },
  { tag: 'br',     handler: () => `\n` },
  { tag: 'li',     handler: (text, _, ctx) =>
      ctx.ordered ? `${ctx.index}. ${text}\n` : `- ${text}\n` },
  { tag: 'blockquote', handler: (text) =>
      text.split('\n').map(l => `> ${l}`).join('\n') + '\n\n' },
  { tag: 'pre',    handler: (text, el) => {
      const lang = el.querySelector('code')?.className.replace('language-', '') || '';
      return `\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
  }},
];

export function htmlToMarkdown(html: string): string {
  // Parser DOM
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return nodeToMarkdown(doc.body);
}
```

---

## WBS-GM-003.02

Subtarefa: Implementar paste-plugin para CodeMirror 6

Artefato:

```
src/editor/paste/paste-plugin.ts   [CRIAR]
```

```typescript
import { EditorView } from '@codemirror/view';
import { htmlToMarkdown } from './html-to-md';

export const smartPasteExtension = EditorView.domEventHandlers({
  paste(event, view) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;

    // Verificar se há HTML no clipboard
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    if (html && html.trim().length > 0) {
      event.preventDefault();

      // Converter HTML para Markdown
      const markdown = htmlToMarkdown(html);

      // Inserir no editor
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: markdown }
      });

      return true;
    }

    // Sem HTML: comportamento padrão
    return false;
  }
});
```

---

## WBS-GM-003.03

Subtarefa: Implementar Ctrl+Shift+V (colar sem conversão)

Artefato:

```
src/hooks/useKeyboardShortcuts.ts   [MODIFICAR]
```

Comportamento:

```
Ctrl+Shift+V → colar texto/HTML bruto sem conversão
```

---

## WBS-GM-003.04

Subtarefa: Toggle de Smart Paste nas configurações

Artefato:

```
src/state/settings.ts                        [MODIFICAR]
src/components/settings/EditorSettings.tsx   [MODIFICAR]
```

Configuração:

```typescript
export interface AppSettings {
  // ... existente ...
  smartPaste: boolean; // padrão: true
}
```

UI:

```
Settings → Editor
  Smart Paste: [✓] Converter HTML ao colar
```

---

## WBS-GM-003.05

Subtarefa: Testes de conversão HTML → Markdown

Artefato:

```
tests/editor/smart-paste.test.ts   [CRIAR]
```

Casos obrigatórios:

```typescript
describe('HTML to Markdown', () => {
  test('h1 → # heading', () => {
    expect(htmlToMarkdown('<h1>Título</h1>'))
      .toBe('# Título\n\n');
  });

  test('strong → **negrito**', () => {
    expect(htmlToMarkdown('<p>texto <strong>negrito</strong></p>'))
      .toContain('**negrito**');
  });

  test('ul → lista', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('- Item 1');
    expect(md).toContain('- Item 2');
  });

  test('ol → lista numerada', () => {
    const html = '<ol><li>Primeiro</li><li>Segundo</li></ol>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('1. Primeiro');
    expect(md).toContain('2. Segundo');
  });

  test('a → link markdown', () => {
    const html = '<a href="https://exemplo.com">Texto</a>';
    expect(htmlToMarkdown(html))
      .toContain('[Texto](https://exemplo.com)');
  });

  test('code → `inline`', () => {
    expect(htmlToMarkdown('<code>console.log()</code>'))
      .toContain('`console.log()`');
  });

  test('pre code → bloco de código', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    expect(htmlToMarkdown(html))
      .toContain('```\nconst x = 1;\n```');
  });

  test('texto simples → sem alteração', () => {
    expect(htmlToMarkdown('texto simples'))
      .toBe('texto simples');
  });
});
```

---

## Critérios de Aceitação — WBS-GM-003

```
[ ] Colar HTML de site converte para Markdown
[ ] Colar HTML do Google Docs converte corretamente
[ ] Colar texto simples mantém comportamento padrão
[ ] h1-h6 convertidos corretamente
[ ] strong/b → **negrito**
[ ] em/i → _itálico_
[ ] del/s → ~~tachado~~
[ ] ul/li → lista com -
[ ] ol/li → lista numerada
[ ] a → [texto](url)
[ ] img → ![alt](src)
[ ] code → `inline`
[ ] pre/code → bloco ```
[ ] blockquote → >
[ ] Ctrl+Shift+V cola sem conversão
[ ] Toggle nas configurações funciona
[ ] Testes de conversão passam 100%
```

Verify: `smart_paste_pass`

---