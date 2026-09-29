import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SplitDivider,
  loadSavedSplitOrientation,
  saveSplitOrientation,
  loadSavedSplitRatio,
  saveSplitRatio,
  SPLIT_ORIENTATION_STORAGE_KEY,
  SPLIT_RATIO_VERTICAL_STORAGE_KEY,
  SPLIT_RATIO_HORIZONTAL_STORAGE_KEY,
} from "../../src/components/layout/SplitDivider";
import {
  BidirectionalSplitLayout,
} from "../../src/components/layout/BidirectionalSplitLayout";

describe("Task 053-M: Bidirectional Split Layout", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Split storage & persistence", () => {
    it("defaults orientation to vertical and allows persistence", () => {
      expect(loadSavedSplitOrientation()).toBe("vertical");
      saveSplitOrientation("horizontal");
      expect(loadSavedSplitOrientation()).toBe("horizontal");
      expect(localStorage.getItem(SPLIT_ORIENTATION_STORAGE_KEY)).toBe("horizontal");
    });

    it("persists ratio independently for vertical and horizontal orientations", () => {
      saveSplitRatio(0.42, "vertical");
      saveSplitRatio(0.65, "horizontal");

      expect(loadSavedSplitRatio("vertical")).toBe(0.42);
      expect(loadSavedSplitRatio("horizontal")).toBe(0.65);
      expect(localStorage.getItem(SPLIT_RATIO_VERTICAL_STORAGE_KEY)).toBe("0.420");
      expect(localStorage.getItem(SPLIT_RATIO_HORIZONTAL_STORAGE_KEY)).toBe("0.650");
    });
  });

  describe("SplitDivider Component", () => {
    it("renders with correct accessibility roles and orientation in vertical mode", () => {
      const containerRef = { current: null };
      const html = renderToStaticMarkup(
        React.createElement(SplitDivider, {
          orientation: "vertical",
          ratio: 0.5,
          onChangeRatio: () => {},
          containerRef,
        })
      );

      expect(html).toContain('role="separator"');
      expect(html).toContain('aria-orientation="vertical"');
      expect(html).toContain('aria-valuenow="50"');
      expect(html).toContain("is-vertical");
    });

    it("renders with correct accessibility roles and orientation in horizontal mode", () => {
      const containerRef = { current: null };
      const html = renderToStaticMarkup(
        React.createElement(SplitDivider, {
          orientation: "horizontal",
          ratio: 0.65,
          onChangeRatio: () => {},
          containerRef,
        })
      );

      expect(html).toContain('role="separator"');
      expect(html).toContain('aria-orientation="horizontal"');
      expect(html).toContain('aria-valuenow="65"');
      expect(html).toContain("is-horizontal");
    });
  });

  describe("BidirectionalSplitLayout Component", () => {
    it("renders vertical split layout with side-by-side panes", () => {
      const html = renderToStaticMarkup(
        React.createElement(BidirectionalSplitLayout, {
          orientation: "vertical",
          ratio: 0.4,
          onChangeRatio: () => {},
          firstPane: React.createElement("div", { "data-testid": "editor-pane" }, "Editor Content"),
          secondPane: React.createElement("div", { "data-testid": "preview-pane" }, "Preview Content"),
        })
      );

      expect(html).toContain("split-layout");
      expect(html).toContain("is-vertical");
      expect(html).toContain('data-orientation="vertical"');
      expect(html).toContain("width:40.00%");
      expect(html).toContain("Editor Content");
      expect(html).toContain("Preview Content");
      expect(html).toContain('role="separator"');
    });

    it("renders horizontal split layout with top/bottom panes", () => {
      const html = renderToStaticMarkup(
        React.createElement(BidirectionalSplitLayout, {
          orientation: "horizontal",
          ratio: 0.65,
          onChangeRatio: () => {},
          firstPane: React.createElement("div", { "data-testid": "editor-pane" }, "Editor Top"),
          secondPane: React.createElement("div", { "data-testid": "preview-pane" }, "Preview Bottom"),
        })
      );

      expect(html).toContain("split-layout");
      expect(html).toContain("is-horizontal");
      expect(html).toContain('data-orientation="horizontal"');
      expect(html).toContain("height:65.00%");
      expect(html).toContain("Editor Top");
      expect(html).toContain("Preview Bottom");
      expect(html).toContain('role="separator"');
    });

    it("supports reversible maximization of either pane", () => {
      const htmlFirst = renderToStaticMarkup(
        React.createElement(BidirectionalSplitLayout, {
          orientation: "vertical",
          ratio: 0.5,
          onChangeRatio: () => {},
          maximizedPane: "first",
          firstPane: React.createElement("div", null, "Editor Max"),
          secondPane: React.createElement("div", null, "Preview Hidden"),
        })
      );

      expect(htmlFirst).toContain("maximized-first");
      expect(htmlFirst).not.toContain("role=\"separator\"");
      expect(htmlFirst).toContain("Editor Max");
      expect(htmlFirst).not.toContain("Preview Hidden");

      const htmlSecond = renderToStaticMarkup(
        React.createElement(BidirectionalSplitLayout, {
          orientation: "vertical",
          ratio: 0.5,
          onChangeRatio: () => {},
          maximizedPane: "second",
          firstPane: React.createElement("div", null, "Editor Hidden"),
          secondPane: React.createElement("div", null, "Preview Max"),
        })
      );

      expect(htmlSecond).toContain("maximized-second");
      expect(htmlSecond).not.toContain("role=\"separator\"");
      expect(htmlSecond).not.toContain("Editor Hidden");
      expect(htmlSecond).toContain("Preview Max");
    });
  });
});
