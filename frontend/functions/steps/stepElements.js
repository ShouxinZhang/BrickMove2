import { state } from '../core/state.js';
import { createSubstepElement } from './substepElements.js';

export function createStepElement(stepText = '', apiText = '', stepTitle = '', substeps = []) {
  state.stepCount += 1;

  const stepDiv = document.createElement('div');
  stepDiv.className = 'step-item';
  stepDiv.dataset.stepId = String(state.stepCount);

  stepDiv.appendChild(buildStepInsertionButton('insert-step-before-btn', '↑ 在最前插入步骤'));
  stepDiv.appendChild(buildHeader(state.stepCount));

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'step-title-input';
  titleInput.placeholder = '步骤标题 (可选)';
  titleInput.value = stepTitle;
  stepDiv.appendChild(titleInput);

  const description = document.createElement('textarea');
  description.rows = 2;
  description.className = 'step-description';
  description.placeholder = '步骤总体描述 (可选)';
  description.value = stepText;
  stepDiv.appendChild(description);

  const substepsContainer = document.createElement('div');
  substepsContainer.className = 'substeps-container';

  if (Array.isArray(substeps) && substeps.length > 0) {
    substeps.forEach(substep => {
      const api2Str = Array.isArray(substep?.api2)
        ? substep.api2.join(', ')
        : (substep?.api2 || '');
      const api1Str = Array.isArray(substep?.api1)
        ? substep.api1.join(', ')
        : (substep?.api1 || '');
      substepsContainer.appendChild(
        createSubstepElement(substep?.description || '', api2Str, api1Str, substep?.id)
      );
    });
  } else if (!apiText || apiText.trim() === '') {
    substepsContainer.appendChild(createSubstepElement());
  }

  stepDiv.appendChild(substepsContainer);

  stepDiv.appendChild(buildStepInsertionButton('insert-step-btn', '↓ 在此后插入步骤'));

  const legacyApiInput = document.createElement('input');
  legacyApiInput.type = 'text';
  legacyApiInput.className = 'step-api-legacy';
  legacyApiInput.placeholder = 'API (旧格式，如无子步骤可用)';
  legacyApiInput.value = apiText;
  stepDiv.appendChild(legacyApiInput);

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

function buildHeader(stepIndex) {
  const header = document.createElement('div');
  header.className = 'step-header';

  const label = document.createElement('strong');
  label.textContent = `步骤 ${stepIndex}`;

  const actions = document.createElement('div');
  actions.className = 'step-header-actions';

  actions.appendChild(buildActionButton('edit-step-json-btn', '编辑JSON'));
  actions.appendChild(buildActionButton('remove-btn', '删除'));

  header.appendChild(label);
  header.appendChild(actions);

  return header;
}

function buildActionButton(className, textContent) {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.textContent = textContent;
  return button;
}

function buildStepInsertionButton(className, textContent) {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.textContent = textContent;
  return button;
}
