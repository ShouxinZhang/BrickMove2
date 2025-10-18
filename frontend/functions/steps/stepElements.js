import { state } from '../state.js';
import { createSubstepHtml } from './substepElements.js';

export function createStepElement(stepText = '', apiText = '', stepTitle = '', substeps = []) {
  state.stepCount += 1;
  const stepDiv = document.createElement('div');
  stepDiv.className = 'step-item';
  stepDiv.dataset.stepId = String(state.stepCount);

  let substepsHtml = '';
  if (Array.isArray(substeps) && substeps.length > 0) {
    substeps.forEach(substep => {
      const api2Str = Array.isArray(substep.api2)
        ? substep.api2.join(', ')
        : (substep.api2 || '');
      const api1Str = Array.isArray(substep.api1)
        ? substep.api1.join(', ')
        : (substep.api1 || '');
      substepsHtml += createSubstepHtml(substep.description || '', api2Str, api1Str);
    });
  } else if (!apiText || apiText.trim() === '') {
    substepsHtml = createSubstepHtml();
  }

  stepDiv.innerHTML = `
    <button class="insert-step-before-btn" type="button">↑ 在最前插入步骤</button>
    <div class="step-header">
      <strong>步骤 ${state.stepCount}</strong>
      <div class="step-header-actions">
        <button class="edit-step-json-btn" type="button">编辑JSON</button>
        <button class="remove-btn" type="button">删除</button>
      </div>
    </div>
    <input type="text" class="step-title-input" placeholder="步骤标题 (可选)" value="${stepTitle}" />
    <textarea rows="2" class="step-description" placeholder="步骤总体描述 (可选)">${stepText}</textarea>
    <div class="substeps-container">
      ${substepsHtml}
    </div>
    <button class="insert-step-btn" type="button">↓ 在此后插入步骤</button>
    <input type="text" class="step-api-legacy" placeholder="API (旧格式，如无子步骤可用)" value="${apiText}" />
  `;

  return stepDiv;
}

export function renumberSteps(container) {
  const stepItems = container.querySelectorAll('.step-item');
  stepItems.forEach((item, index) => {
    const label = item.querySelector('.step-header strong');
    if (label) {
      label.textContent = `步骤 ${index + 1}`;
    }
  });
}
