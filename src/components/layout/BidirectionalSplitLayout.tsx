import { useRef, type ReactNode } from "react";
import { SplitDivider, type SplitOrientation } from "./SplitDivider";
import "../../styles/split-view.css";

export type SplitMaximizedPane = "none" | "first" | "second";

export interface BidirectionalSplitLayoutProps {
  orientation: SplitOrientation;
  ratio: number;
  onChangeRatio: (ratio: number) => void;
  onResetRatio?: () => void;
  maximizedPane?: SplitMaximizedPane;
  firstPane: ReactNode;
  secondPane: ReactNode;
  className?: string;
  minFirstPx?: number;
  minSecondPx?: number;
}

export function BidirectionalSplitLayout({
  orientation,
  ratio,
  onChangeRatio,
  onResetRatio,
  maximizedPane = "none",
  firstPane,
  secondPane,
  className = "",
  minFirstPx = 180,
  minSecondPx = 180,
}: BidirectionalSplitLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (maximizedPane === "first") {
    return (
      <div
        ref={containerRef}
        className={`split-layout is-maximized maximized-first ${className}`.trim()}
        data-orientation={orientation}
      >
        <div className="split-layout-pane first is-full">{firstPane}</div>
      </div>
    );
  }

  if (maximizedPane === "second") {
    return (
      <div
        ref={containerRef}
        className={`split-layout is-maximized maximized-second ${className}`.trim()}
        data-orientation={orientation}
      >
        <div className="split-layout-pane second is-full">{secondPane}</div>
      </div>
    );
  }

  const isVertical = orientation === "vertical";
  const firstStyle = isVertical
    ? { width: `${(ratio * 100).toFixed(2)}%`, height: "100%", minWidth: `${minFirstPx}px` }
    : { height: `${(ratio * 100).toFixed(2)}%`, width: "100%", minHeight: `${minFirstPx}px` };

  const secondStyle = isVertical
    ? { flex: 1, height: "100%", minWidth: `${minSecondPx}px` }
    : { flex: 1, width: "100%", minHeight: `${minSecondPx}px` };

  return (
    <div
      ref={containerRef}
      className={`split-layout is-${orientation} ${className}`.trim()}
      data-orientation={orientation}
    >
      <div className="split-layout-pane first" style={firstStyle}>
        {firstPane}
      </div>

      <SplitDivider
        orientation={orientation}
        ratio={ratio}
        onChangeRatio={onChangeRatio}
        onReset={onResetRatio}
        containerRef={containerRef}
        minFirstPx={minFirstPx}
        minSecondPx={minSecondPx}
      />

      <div className="split-layout-pane second" style={secondStyle}>
        {secondPane}
      </div>
    </div>
  );
}
