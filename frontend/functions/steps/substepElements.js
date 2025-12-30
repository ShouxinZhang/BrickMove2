import { nextSubstepId } from '../core/state.js';

export function createSubstepElement(description = '', api2 = '', api1 = '', substepId, symbols = '') {
  const id = substepId || nextSubstepId();
  const wrapper = document.createElement('div');
  wrapper.className = 'substep-item';
  wrapper.dataset.substepId = id;

  const insertBeforeBtn = document.createElement('button');
  insertBeforeBtn.className = 'insert-substep-before-btn';
  insertBeforeBtn.type = 'button';
  insertBeforeBtn.title = '在此前插入子步骤';
  insertBeforeBtn.textContent = '↑ 插入';

  const header = document.createElement('div');
  header.className = 'substep-header';

  const bullet = document.createElement('span');
  bullet.textContent = '•';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.type = 'button';
  removeBtn.title = '删除此子步骤';
  removeBtn.textContent = '×';

  header.appendChild(bullet);
  header.appendChild(removeBtn);

  const descriptionEl = document.createElement('textarea');
  descriptionEl.rows = 2;
  descriptionEl.className = 'substep-description';
  descriptionEl.placeholder = '子步骤描述 (支持 MathJax)';
  descriptionEl.value = description;

  const apiInputs = document.createElement('div');
  apiInputs.className = 'api-inputs';

  apiInputs.appendChild(buildApiInputGroup('2分 API (single exact):', 'substep-api-2', api2));
  apiInputs.appendChild(buildApiInputGroup('1分 API (combine exact):', 'substep-api-1', api1));

  const symbolsGroup = document.createElement('div');
  symbolsGroup.className = 'api-input-group';
  const symbolsLabel = document.createElement('label');
  symbolsLabel.className = 'api-label';
  symbolsLabel.textContent = '符号 (逗号分隔，继承叠加)';
  const symbolsInput = document.createElement('input');
  symbolsInput.type = 'text';
  symbolsInput.className = 'substep-symbols';
  symbolsInput.placeholder = '如 x:R, f:R→R';
  symbolsInput.value = symbols || '';
  symbolsGroup.appendChild(symbolsLabel);
  symbolsGroup.appendChild(symbolsInput);

  const insertAfterBtn = document.createElement('button');
  insertAfterBtn.className = 'insert-substep-btn';
  insertAfterBtn.type = 'button';
  insertAfterBtn.title = '在此后插入子步骤';
  insertAfterBtn.textContent = '↓ 插入';

  wrapper.appendChild(insertBeforeBtn);
  wrapper.appendChild(header);
  wrapper.appendChild(descriptionEl);
  wrapper.appendChild(apiInputs);
  wrapper.appendChild(insertAfterBtn);

  return wrapper;
}

function buildApiInputGroup(labelText, inputClassName, defaultValue) {
  const group = document.createElement('div');
  group.className = 'api-input-group';

  const label = document.createElement('label');
  label.className = 'api-label';
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = inputClassName;
  input.placeholder = '逗号分隔';
  input.value = defaultValue || '';

  group.appendChild(label);
  group.appendChild(input);
  return group;
}
