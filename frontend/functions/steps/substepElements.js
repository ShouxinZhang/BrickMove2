import { nextSubstepId } from '../state.js';

export function createSubstepHtml(description = '', api2 = '', api1 = '', substepId) {
  const id = substepId || nextSubstepId();
  return `
    <div class="substep-item" data-substep-id="${id}">
      <button class="insert-substep-before-btn" type="button" title="在此前插入子步骤">↑ 插入</button>
      <div class="substep-header">
        <span>•</span>
        <button class="remove-btn" type="button" title="删除此子步骤">×</button>
      </div>
      <textarea rows="2" class="substep-description" placeholder="子步骤描述 (支持 MathJax)">${description}</textarea>
      <div class="api-inputs">
        <div class="api-input-group">
          <label class="api-label">2分 API (single exact):</label>
          <input type="text" class="substep-api-2" placeholder="逗号分隔" value="${api2}" />
        </div>
        <div class="api-input-group">
          <label class="api-label">1分 API (combine exact):</label>
          <input type="text" class="substep-api-1" placeholder="逗号分隔" value="${api1}" />
        </div>
      </div>
      <button class="insert-substep-btn" type="button" title="在此后插入子步骤">↓ 插入</button>
    </div>
  `;
}
