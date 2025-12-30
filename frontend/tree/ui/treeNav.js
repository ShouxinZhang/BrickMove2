import {
  getState,
  traverse,
  toggleExpanded,
  selectNode,
  computeContextSymbols,
  createNode,
  addChild,
  removeNode,
  getNodeById,
  moveNodeRelative
} from '../core/state.js';
import { getSettings } from '../core/settings.js';
import { treeNav } from './dom.js';

let searchTerm = '';
let draggingId = null;

export function setSearchTerm(term) {
  searchTerm = term.trim().toLowerCase();
  renderTreeNav();
}

export function renderTreeNav() {
  const { root, selectedId, expanded } = getState();
  if (!root) {
    treeNav.innerHTML = '<p class="tree-placeholder">暂无节点</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const ul = buildNodeList(root, expanded, selectedId, 0);
  fragment.appendChild(ul);
  treeNav.innerHTML = '';
  treeNav.appendChild(fragment);
}

function buildNodeList(node, expanded, selectedId, depth) {
  const ul = document.createElement('ul');

  const li = document.createElement('li');
  const row = document.createElement('div');
  row.className = 'tree-node-row';
  row.dataset.nodeId = node.id;
  if (node.id === selectedId) {
    row.classList.add('active');
  }

  const matchesSearch = matchesNode(node, searchTerm);
  if (searchTerm && !matchesSearch) {
    row.classList.add('dimmed');
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tree-node-toggle';
  const hasChildren = node.children && node.children.length > 0;
  toggle.textContent = hasChildren ? (expanded.has(node.id) ? '-' : '+') : '·';
  toggle.disabled = !hasChildren;
  toggle.addEventListener('click', event => {
    event.stopPropagation();
    toggleExpanded(node.id);
    renderTreeNav();
  });

  const label = document.createElement('span');
  label.className = 'tree-node-label';
  label.textContent = buildNodeLabel(node, depth);

  const counts = document.createElement('span');
  counts.className = 'tree-node-counts';
  counts.textContent = buildNodeMeta(node);

  const branchBtn = document.createElement('button');
  branchBtn.type = 'button';
  branchBtn.className = 'tree-node-action-btn tree-node-branch-btn';
  branchBtn.title = '添加分支';
  branchBtn.textContent = '+';
  branchBtn.addEventListener('click', event => {
    event.stopPropagation();
    const childIndex = (node.children?.length || 0) + 1;
    const defaultName = `步骤 ${childIndex}`;
    const child = createNode({ name: defaultName });
    addChild(node.id, child);
    selectNode(child.id);
    renderTreeNav();
    const selectEvent = new CustomEvent('tree-node-selected', { detail: { nodeId: child.id } });
    treeNav.dispatchEvent(selectEvent);
  });

  const actionGroup = document.createElement('div');
  actionGroup.className = 'tree-node-actions-group';

  row.appendChild(toggle);
  row.appendChild(label);
  row.appendChild(counts);

  const isRoot = depth === 0;
  if (!isRoot) {
    // Enable drag and drop reordering for non-root nodes
    row.setAttribute('draggable', 'true');
    row.addEventListener('dragstart', event => {
      draggingId = node.id;
      row.classList.add('dragging');
      try {
        event.dataTransfer.setData('text/plain', node.id);
      } catch (_) {}
      event.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      draggingId = null;
      row.classList.remove('dragging');
    });

    row.addEventListener('dragover', event => {
      if (!draggingId) return;
      const src = getNodeById(draggingId);
      const tgt = getNodeById(node.id);
      if (!src || !tgt || src.parent !== tgt.parent) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over');
    });
    row.addEventListener('drop', event => {
      row.classList.remove('drag-over');
      const sourceId = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || draggingId;
      if (!sourceId || sourceId === node.id) return;
      const src = getNodeById(sourceId);
      const tgt = getNodeById(node.id);
      if (!src || !tgt || src.parent !== tgt.parent) return;

      // Place before/after based on mouse position
      let position = 'before';
      const rect = row.getBoundingClientRect();
      const offset = event.clientY - rect.top;
      if (offset > rect.height / 2) position = 'after';

      const moved = moveNodeRelative(sourceId, node.id, position);
      if (moved) {
        renderTreeNav();
        const { selectedId: currentSelected } = getState();
        const selectEvent = new CustomEvent('tree-node-selected', { detail: { nodeId: currentSelected } });
        treeNav.dispatchEvent(selectEvent);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tree-node-action-btn tree-node-remove-btn';
    removeBtn.title = '删除节点';
    removeBtn.textContent = '−';
    removeBtn.addEventListener('click', event => {
      event.stopPropagation();
      let proceed = true;
      if (getSettings().confirmDelete) {
        proceed = window.confirm('确定删除此节点及其所有子节点吗？');
      }
      if (!proceed) {
        return;
      }
      const removed = removeNode(node.id);
      if (!removed) {
        return;
      }
      renderTreeNav();
      const { selectedId: currentSelected } = getState();
      const selectEvent = new CustomEvent('tree-node-selected', { detail: { nodeId: currentSelected } });
      treeNav.dispatchEvent(selectEvent);
    });
    actionGroup.appendChild(removeBtn);
  }

  actionGroup.appendChild(branchBtn);
  row.appendChild(actionGroup);

  row.addEventListener('click', () => {
    selectNode(node.id);
    renderTreeNav();
    const selectEvent = new CustomEvent('tree-node-selected', { detail: { nodeId: node.id } });
    treeNav.dispatchEvent(selectEvent);
  });

  li.appendChild(row);

  if (hasChildren && expanded.has(node.id)) {
    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    node.children.forEach(child => {
      const childList = buildNodeList(child, expanded, selectedId, depth + 1);
      childContainer.appendChild(childList);
    });
    li.appendChild(childContainer);
  }

  ul.appendChild(li);
  return ul;
}

function buildNodeLabel(node, depth) {
  if (node.name && node.name.trim() !== '') {
    return node.name.trim();
  }
  if (depth === 0) {
    return '根节点';
  }
  const problem = node.problem?.trim();
  if (problem) {
    return problem.length > 20 ? `${problem.slice(0, 20)}…` : problem;
  }
  const description = node.description?.trim();
  if (description) {
    return description.length > 20 ? `${description.slice(0, 20)}…` : description;
  }
  return `节点 ${node.id.split('-').pop()}`;
}

function buildNodeMeta(node) {
  const hasDescription = node.description && node.description.trim() !== '' ? 1 : 0;
  const children = node.children?.length || 0;
  const symbols = computeContextSymbols(node.id).length;
  return `D${hasDescription}|C${children}|Σ${symbols}`;
}

function matchesNode(node, term) {
  if (!term) return true;
  const tokens = [node.name, node.problem, node.symbols, node.description, node.mathProof];
  return tokens.some(token => (token || '').toLowerCase().includes(term));
}

export function findFirstMatch(term) {
  if (!term) return null;
  term = term.toLowerCase();
  const { root } = getState();
  let result = null;
  traverse(root, node => {
    if (result) return;
    if (matchesNode(node, term)) {
      result = node;
    }
  });
  return result;
}
