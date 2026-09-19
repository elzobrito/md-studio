export type NodeType = "file" | "folder";

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: NodeType;
  depth: number;
  children?: FileTreeNode[];
  isExpanded?: boolean;
  isActive?: boolean;
  lastModified?: Date;
  size?: number;
}
