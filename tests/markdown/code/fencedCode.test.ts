import { describe, expect, it } from "vitest";
import { findFencedCodeBlocks, replaceFencedCodeBlock } from "../../../src/markdown/fencedCode";

describe("fencedCode block utilities", () => {
  it("finds all fenced code blocks in a markdown document", () => {
    const md = `# Document
Here is Python:
\`\`\`python
def foo():
    return 42
\`\`\`

Here is JavaScript:
\`\`\`js
const a = 1;
\`\`\`
`;
    const blocks = findFencedCodeBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].language).toBe("python");
    expect(blocks[0].code).toBe("def foo():\n    return 42");
    expect(blocks[1].language).toBe("js");
    expect(blocks[1].code).toBe("const a = 1;");
  });

  it("replaces the target fenced code block atomically", () => {
    const md = `Header
\`\`\`python
def foo(a,b): return a+b
\`\`\`
Middle
\`\`\`javascript
const x=1;
\`\`\`
Footer`;

    const updatedPython = replaceFencedCodeBlock(
      md,
      0,
      "def foo(a, b):\n    return a + b\n"
    );

    expect(updatedPython).toBe(`Header
\`\`\`python
def foo(a, b):
    return a + b
\`\`\`
Middle
\`\`\`javascript
const x=1;
\`\`\`
Footer`);

    const updatedJs = replaceFencedCodeBlock(
      updatedPython,
      1,
      "const x = 1;\n"
    );

    expect(updatedJs).toBe(`Header
\`\`\`python
def foo(a, b):
    return a + b
\`\`\`
Middle
\`\`\`javascript
const x = 1;
\`\`\`
Footer`);
  });

  it("handles code block at the start and end of document", () => {
    const md = `\`\`\`rust
fn main(){println!("hi");}
\`\`\``;

    const updated = replaceFencedCodeBlock(
      md,
      0,
      "fn main() {\n    println!(\"hi\");\n}\n"
    );

    expect(updated).toBe(`\`\`\`rust
fn main() {\n    println!(\"hi\");\n}
\`\`\``);
  });
});
