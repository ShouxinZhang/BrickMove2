let nodeCounter = 0;

const state = {
  root: null,
  selectedId: null,
  expanded: new Set()
};

export function initState() {
  nodeCounter = 0;
  const root = createNode({
    name: '定理根节点',
    symbols: '',
    problem: '',
    description: '',
    mathProof: '',
    api2: '',
    api1: '',
    children: []
  });
  state.root = root;
  state.selectedId = root.id;
  state.expanded = new Set([root.id]);
}

export function getState() {
  return state;
}

export function createNode({
  name = '',
  symbols = '',
  problem = '',
  description = '',
  mathProof = '',
  api2 = '',
  api1 = '',
  children = []
} = {}) {
  nodeCounter += 1;
  const node = {
    id: `node-${nodeCounter}`,
    name,
    symbols: normalizeSymbols(symbols),
    problem,
    description,
    mathProof,
    api2: normalizeApi(api2),
    api1: normalizeApi(api1),
    children: []
  };

  if (Array.isArray(children) && children.length > 0) {
    children.forEach(child => {
      if (child && typeof child === 'object') {
        node.children.push(child);
      }
    });
  }

  return node;
}

export function getNodeById(id) {
  if (!state.root) return null;
  if (state.root.id === id) {
    return { node: state.root, parent: null };
  }
  const queue = [{ node: state.root, parent: null }];
  while (queue.length > 0) {
    const { node, parent } = queue.shift();
    for (const child of node.children) {
      if (child.id === id) {
        return { node: child, parent: node };
      }
      queue.push({ node: child, parent: node });
    }
  }
  return null;
}

export function selectNode(id) {
  const found = getNodeById(id);
  if (!found) {
    return false;
  }
  state.selectedId = id;
  return true;
}

export function addChild(parentId, node) {
  const target = getNodeById(parentId);
  if (!target) {
    throw new Error('父节点不存在');
  }
  target.node.children.push(node);
  state.expanded.add(parentId);
}

export function removeNode(nodeId) {
  if (!state.root || state.root.id === nodeId) {
    return false;
  }
  const found = getNodeById(nodeId);
  if (!found || !found.parent) {
    return false;
  }
  const parent = found.parent;
  parent.children = parent.children.filter(child => child.id !== nodeId);
  if (state.selectedId === nodeId) {
    state.selectedId = parent.id;
  }
  state.expanded.delete(nodeId);
  return true;
}

// Move a node relative to a sibling within the same parent.
// position: 'before' | 'after'
export function moveNodeRelative(sourceId, targetId, position = 'before') {
  if (!state.root) return false;
  if (!sourceId || !targetId || sourceId === targetId) return false;

  const from = getNodeById(sourceId);
  const to = getNodeById(targetId);
  if (!from || !to) return false;
  const parent = from.parent;
  if (!parent || parent !== to.parent) {
    // Only support reordering within the same parent for now
    return false;
  }
  const children = parent.children;
  const fromIndex = children.findIndex(c => c.id === sourceId);
  const targetIndex = children.findIndex(c => c.id === targetId);
  if (fromIndex === -1 || targetIndex === -1) return false;

  let newIndex = position === 'after' ? targetIndex + 1 : targetIndex;
  // Remove source first
  const [moved] = children.splice(fromIndex, 1);
  // If the source index was before the target index and we insert after removal,
  // the target shifts left by 1; adjust insertion point accordingly.
  if (fromIndex < newIndex) {
    newIndex -= 1;
  }
  // Clamp newIndex to [0, children.length]
  newIndex = Math.max(0, Math.min(newIndex, children.length));
  children.splice(newIndex, 0, moved);
  return true;
}

export function updateNode(nodeId, patch) {
  const found = getNodeById(nodeId);
  if (!found) {
    throw new Error('节点不存在');
  }
  Object.assign(found.node, patch);
}

export function toggleExpanded(nodeId, force = null) {
  if (force === true) {
    state.expanded.add(nodeId);
    return;
  }
  if (force === false) {
    state.expanded.delete(nodeId);
    return;
  }
  if (state.expanded.has(nodeId)) {
    state.expanded.delete(nodeId);
  } else {
    state.expanded.add(nodeId);
  }
}

export function expandAll() {
  const allIds = [];
  traverse(state.root, node => {
    allIds.push(node.id);
  });
  state.expanded = new Set(allIds);
}

export function collapseAll() {
  state.expanded = new Set([state.root?.id].filter(Boolean));
}

export function traverse(node, visit) {
  if (!node) return;
  visit(node);
  node.children.forEach(child => traverse(child, visit));
}

export function findNodePath(nodeId) {
  const path = [];
  const dfs = (node, parents) => {
    if (!node) return false;
    const next = [...parents, node];
    if (node.id === nodeId) {
      path.push(...next);
      return true;
    }
    return node.children.some(child => dfs(child, next));
  };
  dfs(state.root, []);
  return path;
}

export function parseList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function computeContextSymbols(nodeId) {
  const path = findNodePath(nodeId);
  if (path.length === 0) return [];
  const merged = [];
  path.forEach(node => {
    const symbols = parseList(node.symbols);
    symbols.forEach(sym => {
      if (!merged.includes(sym)) {
        merged.push(sym);
      }
    });
  });
  return merged;
}

export function toSerializable() {
  return {
    root: cloneNode(state.root)
  };
}

function cloneNode(node) {
  return {
    id: node.id,
    name: node.name,
    symbols: node.symbols,
    problem: node.problem,
    description: node.description,
    mathProof: node.mathProof,
    api2: node.api2,
    api1: node.api1,
    children: node.children.map(cloneNode)
  };
}

export function loadFromSerialized(data) {
  if (!data || typeof data !== 'object' || !data.root) {
    throw new Error('无效的证明树数据');
  }
  nodeCounter = 0;
  const rebuild = node => {
    const rebuilt = {
      id: node.id || `node-${++nodeCounter}`,
      name: node.name || '',
      symbols: normalizeSymbols(node.symbols || ''),
      problem: node.problem || '',
      description: node.description || node.body || '',
      mathProof: node.mathProof || '',
      api2: normalizeApi(node.api2 || node.apis || node.api),
      api1: normalizeApi(node.api1),
      children: []
    };

    const rebuiltChildren = [];
    if (Array.isArray(node.children)) {
      node.children.forEach(child => {
        rebuiltChildren.push(rebuild(child));
      });
    }

    if (Array.isArray(node.steps)) {
      node.steps.forEach((step, index) => {
        rebuiltChildren.push(rebuild(convertLegacyStep(step, index)));
      });
    }

    rebuilt.children = rebuiltChildren;
    return rebuilt;
  };

  state.root = rebuild(data.root);

  state.selectedId = state.root.id;
  state.expanded = new Set();
  traverse(state.root, node => {
    state.expanded.add(node.id);
  });

  let maxNodeId = 0;
  traverse(state.root, node => {
    const match = /(node|step)-(\d+)/.exec(node.id || '');
    if (match) {
      maxNodeId = Math.max(maxNodeId, Number(match[2]));
    }
  });
  nodeCounter = Math.max(nodeCounter, maxNodeId);
}

function normalizeSymbols(value) {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

function normalizeApi(value) {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

function convertLegacyStep(step, index = 0) {
  const description = step.description || step.step || '';
  const name = step.title || `步骤 ${index + 1}`;

  const node = {
    id: step.id,
    name,
    symbols: normalizeSymbols(step.symbols || ''),
    problem: '',
    description,
    mathProof: step.mathProof || '',
    api2: normalizeApi(step.api2 || step.apis || step.api),
    api1: normalizeApi(step.api1),
    children: []
  };

  if (Array.isArray(step.substeps) && step.substeps.length > 0) {
    node.children = step.substeps.map((sub, idx) => ({
      id: sub.id,
      name: sub.title || `子步骤 ${idx + 1}`,
      symbols: normalizeSymbols(sub.symbols || ''),
      problem: '',
      description: sub.description || '',
      mathProof: sub.mathProof || '',
      api2: normalizeApi(sub.api2),
      api1: normalizeApi(sub.api1),
      children: []
    }));
  }

  return node;
}
