import { TreeNode } from '@/types';

export function isLeaf(node: TreeNode): boolean {
  return node.children.length === 0;
}

export function createEmptyNode(): TreeNode {
  return {
    id: crypto.randomUUID(),
    statement: '',
    apis: [],
    children: [],
  };
}

export function updateNodeById(root: TreeNode, id: string, updater: (n: TreeNode) => TreeNode): TreeNode {
  if (root.id === id) return updater(root);

  if (root.children.length === 0) return root;

  const nextChildren = root.children.map((child) => updateNodeById(child, id, updater));

  // Preserve referential equality if nothing changed.
  const changed = nextChildren.some((c, i) => c !== root.children[i]);
  return changed ? { ...root, children: nextChildren } : root;
}

export function findNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function deleteNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return null;

  if (root.children.length === 0) return root;

  const filtered = root.children
    .map((child) => deleteNodeById(child, id))
    .filter((child): child is TreeNode => child !== null);

  // Preserve referential equality if nothing changed.
  if (filtered.length === root.children.length) {
    const changed = filtered.some((c, i) => c !== root.children[i]);
    return changed ? { ...root, children: filtered } : root;
  }

  return { ...root, children: filtered };
}

export function addChildStep(root: TreeNode, id: string): TreeNode {
  return updateNodeById(root, id, (node) => {
    const child = createEmptyNode();
    // If it was a leaf, it must lose APIs when gaining children.
    const nextApis = isLeaf(node) ? [] : node.apis;
    return { ...node, apis: nextApis, children: [...node.children, child] };
  });
}

export function breakDownLeaf(root: TreeNode, id: string): TreeNode {
  return updateNodeById(root, id, (node) => {
    const child = createEmptyNode();
    return { ...node, apis: [], children: [child] };
  });
}

export function updateStatement(root: TreeNode, id: string, statement: string): TreeNode {
  return updateNodeById(root, id, (node) => ({ ...node, statement }));
}

export function addApi(root: TreeNode, id: string): TreeNode {
  return updateNodeById(root, id, (node) => ({ 
    ...node, 
    apis: [...node.apis, { name: '', points: 1 }] 
  }));
}

export function updateApi(root: TreeNode, id: string, index: number, value: string): TreeNode {
  return updateNodeById(root, id, (node) => {
    const next = [...node.apis];
    const current = next[index];
    if (typeof current === 'string') {
      next[index] = { name: value, points: 1 };
    } else {
      next[index] = { ...current, name: value };
    }
    return { ...node, apis: next };
  });
}

export function updateApiPoints(root: TreeNode, id: string, index: number, points: 1 | 2): TreeNode {
  return updateNodeById(root, id, (node) => {
    const next = [...node.apis];
    const current = next[index];
    if (typeof current === 'string') {
      next[index] = { name: current, points };
    } else {
      next[index] = { ...current, points };
    }
    return { ...node, apis: next };
  });
}

export function removeApi(root: TreeNode, id: string, index: number): TreeNode {
  return updateNodeById(root, id, (node) => ({ ...node, apis: node.apis.filter((_, i) => i !== index) }));
}

export function collectLeafNodes(node: TreeNode): TreeNode[] {
  if (node.children.length === 0) {
    return [node];
  }
  return node.children.flatMap(collectLeafNodes);
}

export function exportTreeToCsv(root: TreeNode): string {
  const leaves = collectLeafNodes(root);
  
  // CSV header
  const header = 'informal statement,2分api,1分api';
  
  // CSV rows
  const rows = leaves.map((leaf) => {
    const statement = leaf.statement.replace(/"/g, '""'); // Escape quotes
    
    const apis2pt: string[] = [];
    const apis1pt: string[] = [];
    
    leaf.apis.forEach((api) => {
      const name = typeof api === 'string' ? api : api.name;
      const points = typeof api === 'string' ? 1 : api.points;
      if (points === 2) {
        apis2pt.push(name);
      } else {
        apis1pt.push(name);
      }
    });
    
    const col1 = `"${statement}"`;
    const col2 = `"${apis2pt.join(', ')}"`;
    const col3 = `"${apis1pt.join(', ')}"`;
    
    return `${col1},${col2},${col3}`;
  });
  
  return [header, ...rows].join('\n');
}
