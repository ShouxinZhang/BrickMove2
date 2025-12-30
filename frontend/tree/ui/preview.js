import { getState, getNodeById } from '../core/state.js';
import { nodePreview } from './dom.js';
import { buildSubtreeMarkdown } from '../utils/markdown.js';

export function renderPreview() {
  const { selectedId } = getState();
  if (!selectedId) {
    nodePreview.innerHTML = '<p>暂无可预览的节点。</p>';
    return;
  }
  const found = getNodeById(selectedId);
  if (!found) {
    nodePreview.innerHTML = '<p>节点不存在。</p>';
    return;
  }
  const node = found.node;
  const markdown = buildSubtreeMarkdown(node);
  const html = marked.parse(markdown);

  nodePreview.innerHTML = `
    <h2>节点预览（含子树）</h2>
    <div class="preview-card">${html}</div>
  `;

  if (typeof renderMathInElement === 'function') {
    renderMathInElement(nodePreview, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}
