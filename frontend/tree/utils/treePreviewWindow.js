import { getState, computeContextSymbols } from '../core/state.js';

let previewWindow = null;

const WINDOW_FEATURES = 'width=520,height=640,resizable=yes,scrollbars=yes';
const NODE_RADIUS = 26;
const H_SPACING = 150;
const V_SPACING = 120;
const MARGIN_X = 60;
const MARGIN_Y = 80;

export function openTreePreviewWindow() {
  if (previewWindow && !previewWindow.closed) {
    previewWindow.focus();
    renderTreePreview();
    return;
  }

  previewWindow = window.open('', 'proof-tree-preview', WINDOW_FEATURES);
  if (!previewWindow) {
    alert('无法打开预览窗口，请检查浏览器拦截。');
    return;
  }

  previewWindow.document.title = '树目录预览';
  previewWindow.document.body.innerHTML = '';
  previewWindow.document.body.style.margin = '0';
  previewWindow.document.body.style.fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial";

  const style = previewWindow.document.createElement('style');
  style.textContent = buildPreviewStyles();
  previewWindow.document.head.appendChild(style);

  previewWindow.document.body.addEventListener('click', event => {
    const addTarget = event.target.closest('[data-add-child-for]');
    if (addTarget) {
      const parentId = addTarget.getAttribute('data-add-child-for');
      if (parentId && window.__treePreviewAddChild) {
        window.__treePreviewAddChild(parentId);
      }
      return;
    }

    const target = event.target.closest('[data-node-id]');
    if (!target) return;
    const nodeId = target.getAttribute('data-node-id');
    if (!nodeId) return;
    if (window.__treePreviewSelect) {
      window.__treePreviewSelect(nodeId);
    }
  });

  renderTreePreview();
}

export function renderTreePreview() {
  if (!previewWindow || previewWindow.closed) {
    previewWindow = null;
    return;
  }

  const { root, selectedId } = getState();
  if (!root) {
    previewWindow.document.body.innerHTML = '<div class="empty">暂无节点</div>';
    return;
  }

  previewWindow.document.body.innerHTML = buildTreeSvg(root, selectedId);
}

function buildTreeSvg(root, selectedId) {
  const structured = buildStructuredTree(root);
  measureTree(structured);
  const layout = layoutTree(structured, selectedId);

  const links = layout.links
    .map(link => `<line class="tree-link" x1="${link.x1}" y1="${link.y1}" x2="${link.x2}" y2="${link.y2}" />`)
    .join('');

  const nodes = layout.nodes
    .map(node => `
      <g class="tree-node-group${node.active ? ' is-active' : ''}" data-node-id="${node.id}" transform="translate(${node.x}, ${node.y})">
        <circle class="tree-node-circle" r="${NODE_RADIUS}"></circle>
        <text class="tree-node-label" text-anchor="middle" dy="-${NODE_RADIUS + 10}">${escapeHtml(node.label)}</text>
        <text class="tree-node-meta" text-anchor="middle" dy="${NODE_RADIUS + 18}">${escapeHtml(node.meta)}</text>
        <g class="tree-node-add" data-add-child-for="${node.id}" transform="translate(0, ${NODE_RADIUS + 38})">
          <circle class="tree-node-add-circle" r="10"></circle>
          <text class="tree-node-add-label" text-anchor="middle" dy="4">+</text>
        </g>
        <title>${escapeHtml(node.tooltip)}</title>
      </g>
    `)
    .join('');

  return `
    <div class="tree-svg-container">
      <svg class="tree-svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">
        ${links}
        ${nodes}
      </svg>
    </div>
  `;
}

function buildPreviewStyles() {
  return `
    body { background:#f1f5f9; color:#0f172a; padding:12px; }
    .tree-svg-container { width:100%; height:100%; overflow:auto; }
    .tree-svg { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .tree-link { stroke:#cbd5e1; stroke-width:2; }
    .tree-node-group { cursor:pointer; transition:transform 0.12s ease; }
    .tree-node-group:hover .tree-node-circle { stroke:#2563eb; stroke-width:3; }
    .tree-node-circle { fill:#fff; stroke:#94a3b8; stroke-width:2; }
    .tree-node-group.is-active .tree-node-circle { fill:#ebf3ff; stroke:#2563eb; stroke-width:3; }
    .tree-node-label { font-size:12px; font-weight:600; fill:#0f172a; }
    .tree-node-meta { font-size:11px; fill:#64748b; }
    .tree-node-add { opacity:0; pointer-events:none; transition:opacity 0.15s ease; cursor:pointer; }
    .tree-node-add-circle { fill:#2563eb; }
    .tree-node-add-label { fill:#fff; font-size:14px; font-weight:600; }
    .tree-node-group:hover .tree-node-add,
    .tree-node-group.is-active .tree-node-add { opacity:1; pointer-events:auto; }
    .tree-node-add:hover .tree-node-add-circle { fill:#1d4ed8; }
    .empty { padding:24px; text-align:center; color:#94a3b8; }
  `;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function syncTreePreviewWindow() {
  if (previewWindow && !previewWindow.closed) {
    renderTreePreview();
  }
}

function buildStructuredTree(node) {
  const ctx = computeContextSymbols(node.id).length;
  const problem = (node.problem || '').trim();
  const description = (node.description || '').trim();
  const rawLabel = node.name?.trim() || description || problem || node.id;
  const label = truncate(rawLabel, 18);
  return {
    id: node.id,
    label,
    tooltip: [rawLabel, description && description !== rawLabel ? description : '', problem].filter(Boolean).join(' | '),
    meta: `Σ${ctx} · 子${node.children.length}`,
    children: (node.children || []).map(child => buildStructuredTree(child))
  };
}

function measureTree(node) {
  if (!node.children || node.children.length === 0) {
    node.width = 1;
    return 1;
  }
  let total = 0;
  node.children.forEach(child => {
    total += measureTree(child);
  });
  node.width = Math.max(total, 1);
  return node.width;
}

function layoutTree(root, selectedId) {
  const nodes = [];
  const links = [];
  const positions = new Map();
  let maxDepth = 0;

  const assign = (node, depth, startUnit) => {
    maxDepth = Math.max(maxDepth, depth);
    const width = node.width || 1;
    const centerUnits = startUnit + width / 2;
    const x = MARGIN_X + centerUnits * H_SPACING;
    const y = MARGIN_Y + depth * V_SPACING;

    const nodeRecord = {
      id: node.id,
      x,
      y,
      label: node.label,
      tooltip: node.tooltip,
      meta: node.meta,
      active: node.id === selectedId
    };
    nodes.push(nodeRecord);
    positions.set(node.id, nodeRecord);

    let childStart = startUnit;
    (node.children || []).forEach(child => {
      assign(child, depth + 1, childStart);
      const childPos = positions.get(child.id);
      if (childPos) {
        links.push({ x1: x, y1: y + NODE_RADIUS, x2: childPos.x, y2: childPos.y - NODE_RADIUS });
      }
      childStart += child.width || 1;
    });
  };

  assign(root, 0, 0);

  const totalWidthUnits = root.width || 1;
  const width = Math.max(320, MARGIN_X * 2 + totalWidthUnits * H_SPACING);
  const height = Math.max(200, MARGIN_Y * 2 + Math.max(1, maxDepth) * V_SPACING);

  return { nodes, links, width, height };
}

function truncate(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
