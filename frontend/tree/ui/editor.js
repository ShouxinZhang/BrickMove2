import {
  getState,
  getNodeById,
  computeContextSymbols,
  updateNode,
  addChild,
  createNode,
  selectNode,
  removeNode
} from '../core/state.js';
import { getSettings } from '../core/settings.js';
import { nodeEditor } from './dom.js';
import { renderTreeNav } from './treeNav.js';
import { renderPreview } from './preview.js';
import { renderBreadcrumb } from './breadcrumb.js';
import { syncTreePreviewWindow } from '../utils/treePreviewWindow.js';

export function renderEditor() {
  const { selectedId } = getState();
  if (!selectedId) {
    nodeEditor.innerHTML = '<p>请选择一个节点。</p>';
    return;
  }
  const found = getNodeById(selectedId);
  if (!found) {
    nodeEditor.innerHTML = '<p>节点找不到。</p>';
    return;
  }
  const node = found.node;
  const contextSymbols = computeContextSymbols(node.id);

  const container = document.createElement('div');
  container.innerHTML = `
    <h2>节点信息</h2>
    <div class="form-grid">
      <div class="form-row">
        <label>节点标题（树中显示）</label>
        <input type="text" id="nodeNameInput" value="${escapeHtml(node.name || '')}" placeholder="如：引理 1" />
      </div>
      <div class="form-row">
        <label>新增符号（逗号分隔）</label>
        <input type="text" id="nodeSymbolsInput" value="${escapeHtml(node.symbols || '')}" placeholder="如：x:R, y:R" />
        <small style="color:#64748b;">符号设定将继承父节点：${contextSymbols.map(sym => `<code>${escapeHtml(sym)}</code>`).join(' ') || '无'}</small>
      </div>
      <div class="form-row">
        <label>问题 / 子目标描述</label>
        <textarea id="nodeProblemInput" placeholder="描述该节点需要完成的子问题">${escapeHtml(node.problem || '')}</textarea>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-row">
        <label>步骤描述（可选）</label>
        <textarea id="nodeDescriptionInput" rows="2" placeholder="填写本节点的步骤说明">${escapeHtml(node.description || '')}</textarea>
      </div>
      <div class="form-row">
        <label>Math proof（仅用于记录，不导出）</label>
        <textarea id="nodeMathProofInput" rows="3" placeholder="草稿或推理记载">${escapeHtml(node.mathProof || '')}</textarea>
      </div>
      <div class="form-row">
        <label>2分 API (逗号分隔)</label>
        <input type="text" id="nodeApi2Input" value="${escapeHtml(node.api2 || '')}" placeholder="可单独 exact 的 API" />
      </div>
      <div class="form-row">
        <label>1分 API (逗号分隔)</label>
        <input type="text" id="nodeApi1Input" value="${escapeHtml(node.api1 || '')}" placeholder="需要组合使用的 API" />
      </div>
    </div>
    <div class="node-actions">
      <button type="button" id="addStepBtn">+ 添加并列步骤</button>
      ${found.parent ? '<button type="button" id="deleteNodeBtn" class="danger">删除节点</button>' : ''}
    </div>
    ${renderChildStepsSection(node)}
  `;

  nodeEditor.innerHTML = '';
  nodeEditor.appendChild(container);

  bindNodeEvents(node, found.parent);
  bindChildStepEvents();
  syncTreePreviewWindow();
}

function bindNodeEvents(node, parent) {
  const nameInput = nodeEditor.querySelector('#nodeNameInput');
  const symbolsInput = nodeEditor.querySelector('#nodeSymbolsInput');
  const problemInput = nodeEditor.querySelector('#nodeProblemInput');
  const descriptionInput = nodeEditor.querySelector('#nodeDescriptionInput');
  const mathProofInput = nodeEditor.querySelector('#nodeMathProofInput');
  const api2Input = nodeEditor.querySelector('#nodeApi2Input');
  const api1Input = nodeEditor.querySelector('#nodeApi1Input');
  const deleteBtn = nodeEditor.querySelector('#deleteNodeBtn');
  const addStepBtn = nodeEditor.querySelector('#addStepBtn');

  nameInput.addEventListener('input', event => {
    updateNode(node.id, { name: event.target.value });
    renderTreeNav();
    renderBreadcrumb();
    syncTreePreviewWindow();
  });

  symbolsInput.addEventListener('input', event => {
    updateNode(node.id, { symbols: event.target.value });
    renderPreview();
    renderBreadcrumb();
    syncTreePreviewWindow();
  });

  problemInput.addEventListener('input', event => {
    updateNode(node.id, { problem: event.target.value });
    renderPreview();
    renderTreeNav();
    renderBreadcrumb();
    syncTreePreviewWindow();
  });

  descriptionInput.addEventListener('input', event => {
    updateNode(node.id, { description: event.target.value });
    renderPreview();
    syncTreePreviewWindow();
  });

  mathProofInput.addEventListener('input', event => {
    updateNode(node.id, { mathProof: event.target.value });
    renderPreview();
    syncTreePreviewWindow();
  });

  api2Input.addEventListener('input', event => {
    updateNode(node.id, { api2: event.target.value });
    renderPreview();
    syncTreePreviewWindow();
  });

  api1Input.addEventListener('input', event => {
    updateNode(node.id, { api1: event.target.value });
    renderPreview();
    syncTreePreviewWindow();
  });

  if (deleteBtn && parent) {
    deleteBtn.addEventListener('click', () => {
      let proceed = true;
      if (getSettings().confirmDelete) {
        proceed = window.confirm('确定要删除该节点及其所有子节点吗？');
      }
      if (!proceed) return;
      removeNode(node.id);
      renderTreeNav();
      renderEditor();
      renderPreview();
      renderBreadcrumb();
      syncTreePreviewWindow();
    });
  }

  addStepBtn.addEventListener('click', () => {
    const targetParent = parent || node;
    const siblings = Array.isArray(targetParent.children) ? targetParent.children : [];
    const defaultName = `步骤 ${siblings.length + 1}`;
    const child = createNode({ name: defaultName, problem: '', description: '' });
    addChild(targetParent.id, child);

    const nextSelectedId = parent ? targetParent.id : child.id;
    selectNode(nextSelectedId);

    renderTreeNav();
    renderEditor();
    renderPreview();
    renderBreadcrumb();
    syncTreePreviewWindow();

    requestAnimationFrame(() => {
      const newCard = nodeEditor.querySelector(`.step-card[data-step-node-id="${child.id}"] .step-card-title-input`);
      if (newCard) {
        newCard.focus();
      }
    });
  });
}

function bindChildStepEvents() {
  const stepCards = nodeEditor.querySelectorAll('.step-card');
  stepCards.forEach(card => {
    const stepId = card.dataset.stepNodeId;
    if (!stepId) {
      return;
    }

    const titleInput = card.querySelector('.step-card-title-input');
    const problemInput = card.querySelector('.step-card-problem-input');
    const descriptionInput = card.querySelector('.step-card-description-input');
    const symbolsInput = card.querySelector('.step-card-symbols-input');
    const proofInput = card.querySelector('.step-card-proof-input');
    const api2Input = card.querySelector('.step-card-api2-input');
    const api1Input = card.querySelector('.step-card-api1-input');
    const removeBtn = card.querySelector('[data-step-action="remove"]');
    const focusBtn = card.querySelector('[data-step-action="focus"]');
    const addChildBtn = card.querySelector('[data-step-action="add-child"]');

    if (titleInput) {
      titleInput.addEventListener('input', event => {
        const newValue = event.target.value;
        updateNode(stepId, { name: newValue });
        const displayEl = card.querySelector('.step-card-name-display');
        if (displayEl) {
          displayEl.textContent = newValue.trim() !== '' ? newValue : '未命名';
        }
        renderTreeNav();
        renderBreadcrumb();
        renderPreview();
        syncTreePreviewWindow();
      });
    }

    if (problemInput) {
      problemInput.addEventListener('input', event => {
        updateNode(stepId, { problem: event.target.value });
        renderPreview();
        syncTreePreviewWindow();
      });
    }

    if (descriptionInput) {
      descriptionInput.addEventListener('input', event => {
        updateNode(stepId, { description: event.target.value });
        renderPreview();
        syncTreePreviewWindow();
      });
    }

    if (symbolsInput) {
      symbolsInput.addEventListener('input', event => {
        updateNode(stepId, { symbols: event.target.value });
        renderPreview();
        renderBreadcrumb();
        syncTreePreviewWindow();
      });
    }

    if (proofInput) {
      proofInput.addEventListener('input', event => {
        updateNode(stepId, { mathProof: event.target.value });
        renderPreview();
        syncTreePreviewWindow();
      });
    }

    if (api2Input) {
      api2Input.addEventListener('input', event => {
        updateNode(stepId, { api2: event.target.value });
        renderPreview();
        syncTreePreviewWindow();
      });
    }

    if (api1Input) {
      api1Input.addEventListener('input', event => {
        updateNode(stepId, { api1: event.target.value });
        renderPreview();
        syncTreePreviewWindow();
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        let proceed = true;
        if (getSettings().confirmDelete) {
          proceed = window.confirm('确定要删除该步骤及其子节点吗？');
        }
        if (!proceed) {
          return;
        }
        removeNode(stepId);
        renderTreeNav();
        renderEditor();
        renderPreview();
        renderBreadcrumb();
        syncTreePreviewWindow();
      });
    }

    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        if (!selectNode(stepId)) {
          return;
        }
        renderTreeNav();
        renderEditor();
        renderPreview();
        renderBreadcrumb();
        syncTreePreviewWindow();
      });
    }

    if (addChildBtn) {
      addChildBtn.addEventListener('click', () => {
        const target = getNodeById(stepId);
        const parentNode = target ? target.node : null;
        const existingCount = parentNode && Array.isArray(parentNode.children)
          ? parentNode.children.length
          : 0;
        const child = createNode({ name: `子步骤 ${existingCount + 1}` });
        addChild(stepId, child);
        selectNode(child.id);
        renderTreeNav();
        renderEditor();
        renderPreview();
        renderBreadcrumb();
        syncTreePreviewWindow();
      });
    }
  });
}

function renderChildStepsSection(node) {
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) {
    return '<p class="child-hint">当前暂无子步骤，可点击“添加并列步骤”快速创建。</p>';
  }

  const cards = children.map((child, index) => {
    const stepIndex = index + 1;
    const subSummary = Array.isArray(child.children) && child.children.length > 0
      ? `<div class="step-card-summary">含子节点：${child.children.map((sub, idx) => escapeHtml(sub.name?.trim() || `子步骤 ${idx + 1}`)).join('，')}</div>`
      : '';

    const titleDisplay = child.name?.trim() ? escapeHtml(child.name.trim()) : '未命名';

    return `
      <article class="step-card" data-step-node-id="${escapeHtml(child.id)}">
        <header class="step-card-header">
          <div class="step-card-header-main">
            <span class="step-card-index">步骤 ${stepIndex}</span>
            <span class="step-card-name-display">${titleDisplay}</span>
            <span class="step-card-node-id">${escapeHtml(child.id)}</span>
          </div>
          <div class="step-card-actions">
            <button type="button" class="step-card-focus-btn" data-step-action="focus">在树中查看</button>
            <button type="button" class="step-card-remove-btn danger" data-step-action="remove">删除步骤</button>
          </div>
        </header>
        <div class="step-card-fields">
          <div class="step-field">
            <label>步骤标题</label>
            <input type="text" class="step-card-title-input" value="${escapeHtml(child.name || '')}" placeholder="如：步骤 ${stepIndex}" />
          </div>
          <div class="step-field">
            <label>问题 / 子目标描述</label>
            <textarea class="step-card-problem-input" rows="2" placeholder="描述该步骤需要完成的子问题">${escapeHtml(child.problem || '')}</textarea>
          </div>
          <div class="step-field">
            <label>步骤描述（可选）</label>
            <textarea class="step-card-description-input" rows="3" placeholder="填写该步骤的详细说明">${escapeHtml(child.description || '')}</textarea>
          </div>
          <div class="step-field">
            <label>符号设定（逗号分隔）</label>
            <input type="text" class="step-card-symbols-input" value="${escapeHtml(child.symbols || '')}" placeholder="如：x:R, y:R" />
          </div>
          <div class="step-field">
            <label>Math proof（仅用于记录，不导出）</label>
            <textarea class="step-card-proof-input" rows="3" placeholder="记录推理草稿">${escapeHtml(child.mathProof || '')}</textarea>
          </div>
          <div class="step-field step-field-grid">
            <div>
              <label>2分 API</label>
              <input type="text" class="step-card-api2-input" value="${escapeHtml(child.api2 || '')}" placeholder="逗号分隔" />
            </div>
            <div>
              <label>1分 API</label>
              <input type="text" class="step-card-api1-input" value="${escapeHtml(child.api1 || '')}" placeholder="逗号分隔" />
            </div>
          </div>
        </div>
        <footer class="step-card-footer">
          <button type="button" class="step-card-add-child-btn" data-step-action="add-child">+ 在此步骤下添加子节点</button>
          ${subSummary}
        </footer>
      </article>
    `;
  }).join('');

  return `
    <section class="child-steps-section">
      <h3>子步骤列表</h3>
      <div class="step-card-list">
        ${cards}
      </div>
    </section>
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
