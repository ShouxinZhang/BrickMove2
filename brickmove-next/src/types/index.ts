export interface ApiEntry {
  name: string;
  points: 1 | 2;
}

export interface TreeNode {
  id: string;
  statement: string;
  apis: ApiEntry[]; // Array of Lean4 Mathlib APIs with points
  children: TreeNode[];
}
