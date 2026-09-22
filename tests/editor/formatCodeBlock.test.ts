import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { formatCodeBlockAtCursor } from "../../src/editor/formatting/formatCodeBlock";

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
});
