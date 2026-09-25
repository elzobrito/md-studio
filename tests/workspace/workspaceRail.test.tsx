import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  WorkspaceRail,
  DEFAULT_ACTIVITIES,
  FolderIcon,
} from "../../src/components/workspace/WorkspaceRail";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MD-UI-007: Workspace Activity Rail", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("renders the Activity Rail container with default Explorer activity", async () => {
    const root = createRoot(container);
    const onToggle = vi.fn();

    await act(async () => {
      root.render(
        <WorkspaceRail
          activeActivity="explorer"
          isPanelOpen={true}
          onToggleActivity={onToggle}
        />
      );
    });

    const rail = container.querySelector("aside.workspace-rail");
    expect(rail).not.toBeNull();
    expect(rail?.getAttribute("aria-label")).toBe("Barra de atividades do workspace");

    const explorerBtn = container.querySelector<HTMLButtonElement>(
      'button[data-activity-id="explorer"]'
    );
    expect(explorerBtn).not.toBeNull();
    expect(explorerBtn?.classList.contains("is-active")).toBe(true);
    expect(explorerBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(explorerBtn?.getAttribute("aria-label")).toBe("Explorador de Arquivos");

    // Click triggers toggle callback
    await act(async () => {
      explorerBtn?.click();
    });
    expect(onToggle).toHaveBeenCalledWith("explorer");

    act(() => {
      root.unmount();
    });
  });

  it("updates active state when isPanelOpen is false", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceRail
          activeActivity="explorer"
          isPanelOpen={false}
          onToggleActivity={() => {}}
        />
      );
    });

    const explorerBtn = container.querySelector<HTMLButtonElement>(
      'button[data-activity-id="explorer"]'
    );
    expect(explorerBtn).not.toBeNull();
    // When panel is collapsed, button is not highlighted as active panel
    expect(explorerBtn?.classList.contains("is-active")).toBe(false);
    expect(explorerBtn?.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("renders SVG folder icon without emoji", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<FolderIcon />);
    });

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");

    act(() => {
      root.unmount();
    });
  });

  it("respects sort order of registered activities", async () => {
    const root = createRoot(container);
    const customActivities = [
      {
        id: "search",
        label: "Busca",
        icon: <span>S</span>,
        order: 20,
      },
      {
        id: "explorer",
        label: "Explorer",
        icon: <span>E</span>,
        order: 10,
      },
    ];

    await act(async () => {
      root.render(
        <WorkspaceRail
          activeActivity="explorer"
          isPanelOpen={true}
          onToggleActivity={() => {}}
          activities={customActivities}
        />
      );
    });

    const buttons = container.querySelectorAll("button.workspace-rail-btn");
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute("data-activity-id")).toBe("explorer");
    expect(buttons[1].getAttribute("data-activity-id")).toBe("search");

    act(() => {
      root.unmount();
    });
  });
});
