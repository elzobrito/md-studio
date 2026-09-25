import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import {
  formatCodeBlockAtCursor,
  formatDocumentOrCodeBlock,
} from "../../src/editor/formatting/formatCodeBlock";

describe("formatCodeBlockAtCursor (CodeMirror 6)", () => {
  it("formats the fenced code block under the cursor in-place", async () => {
    const initialDoc = `# Title
Here is some text.

\`\`\`javascript
const a=1;function add(x,y){return x+y;}
\`\`\`

Footer`;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [markdown()],
      selection: { anchor: 40 }, // Inside the javascript code block
    });

    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const formatted = await formatCodeBlockAtCursor(view);
    expect(formatted).toBe(true);

    const docText = view.state.doc.toString();
    expect(docText).toContain("const a = 1;\nfunction add(x, y) {\n  return x + y;\n}");
    expect(docText).toContain("# Title");
    expect(docText).toContain("Footer");
  });

  it("returns false if cursor is outside any fenced code block", async () => {
    const initialDoc = `# Title
Here is some text.

\`\`\`javascript
const a=1;
\`\`\`
`;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [markdown()],
      selection: { anchor: 5 }, // On "# Title"
    });

    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const formatted = await formatCodeBlockAtCursor(view);
    expect(formatted).toBe(false);
  });

  it("formats untagged code blocks under cursor using js fallback heuristic", async () => {
    const initialDoc = `# Title
\`\`\`
const a=1;const b=2;
\`\`\`
`;
    const state = EditorState.create({
      doc: initialDoc,
      extensions: [markdown()],
      selection: { anchor: 15 },
    });

    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const formatted = await formatCodeBlockAtCursor(view);
    expect(formatted).toBe(true);
    expect(view.state.doc.toString()).toContain("const a = 1;\nconst b = 2;");
  });
});

describe("formatDocumentOrCodeBlock (CodeMirror 6)", () => {
  it("formats the entire Markdown document when cursor is outside code blocks", async () => {
    const initialDoc = `# Title   

Paragraph with [link](url) and unformatted table:

| a | b |
|---|---|
| 1 | 2 |
`;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [markdown()],
      selection: { anchor: 5 },
    });

    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const formatted = await formatDocumentOrCodeBlock(view);
    expect(formatted).toBe(true);

    const docText = view.state.doc.toString();
    expect(docText).toContain("| a   | b   |");
    expect(docText).toContain("| --- | --- |");
    expect(docText).toContain("| 1   | 2   |");
  });

  it("formats the active code block specifically when cursor is inside it", async () => {
    const initialDoc = `# Title

\`\`\`typescript
const a=1;const b=2;
\`\`\`

Footer text`;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [markdown()],
      selection: { anchor: 20 }, // Inside typescript block
    });

    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const formatted = await formatDocumentOrCodeBlock(view);
    expect(formatted).toBe(true);
    expect(view.state.doc.toString()).toContain("const a = 1;\nconst b = 2;");
  });
});
