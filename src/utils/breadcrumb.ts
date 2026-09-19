export interface BreadcrumbSegment {
  label: string;
  path: string;
  type: "workspace" | "folder" | "file";
}

export function buildBreadcrumb(
  workspaceLabel: string,
  relativePath: string,
): BreadcrumbSegment[] {
  const wsName = workspaceLabel.split("/").filter(Boolean).pop() || "workspace";
  const segments: BreadcrumbSegment[] = [
    {
      label: wsName,
      path: "",
      type: "workspace",
    },
  ];

  if (!relativePath) return segments;

  const parts = relativePath.split("/").filter(Boolean);
  let accumulated = "";

  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    accumulated = accumulated ? `${accumulated}/${parts[i]}` : parts[i];
    segments.push({
      label: parts[i],
      path: accumulated,
      type: isLast ? "file" : "folder",
    });
  }

  return segments;
}
