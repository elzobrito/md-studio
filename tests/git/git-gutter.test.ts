import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  createGitDiffGutter,
  gitDiffField,
  setGitDiffEffect,
} from "../../src/editor/git/gitGutter";
import type { FileDiffGutter } from "../../src/contracts/types";

describe("Git Diff Gutter Extension", () => {
  it("initializes with empty markers", () => {
    const state = EditorState.create({
      doc: "Line 1\nLine 2\nLine 3",
      extensions: [createGitDiffGutter()],
    });

    const markers = state.field(gitDiffField);
    expect(markers.size).toBe(0);
  });

  it("adds added, modified, and deleted markers on dispatch", () => {
    let state = EditorState.create({
      doc: "Line 1\nLine 2\nLine 3\nLine 4\nLine 5",
      extensions: [createGitDiffGutter()],
    });

    const diff: FileDiffGutter = {
      addedLines: [1],
      modifiedLines: [3],
      deletedLines: [5],
    };

    const tr = state.update({
      effects: [setGitDiffEffect.of(diff)],
    });
    state = tr.state;

    const markers = state.field(gitDiffField);
    expect(markers.size).toBe(3);
  });

  it("ignores line numbers that exceed document length", () => {
    let state = EditorState.create({
      doc: "Line 1\nLine 2",
      extensions: [createGitDiffGutter()],
    });

    const diff: FileDiffGutter = {
      addedLines: [1, 999],
      modifiedLines: [],
      deletedLines: [],
    };

    const tr = state.update({
      effects: [setGitDiffEffect.of(diff)],
    });
    state = tr.state;

    const markers = state.field(gitDiffField);
    expect(markers.size).toBe(1);
  });
});
