import { createSubstepHtml } from './substepElements.js';

export function openStepJsonEditor(stepItem, handlers = {}) {
  const jsonData = getStepJsonData(stepItem);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = `
    <h3>编辑 Step JSON</h3>
    <textarea class="modal-textarea" spellcheck="false">${JSON.stringify(jsonData, null, 2)}</textarea>
    <div class="modal-actions">
      <button type="button" class="modal-cancel">取消</button>
      <button type="button" class="modal-apply">应用</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  const textarea = content.querySelector('textarea');
  const cancelBtn = content.querySelector('.modal-cancel');
  const applyBtn = content.querySelector('.modal-apply');

  const close = () => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      close();
    }
  });

  applyBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(textarea.value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('JSON 必须是对象');
      }
      applyStepJsonData(stepItem, parsed);
      close();
      if (typeof handlers.onApply === 'function') {
        handlers.onApply();
      }
    } catch (error) {
      alert(`解析 JSON 失败：${error.message}`);
    }
  });
}

function getStepJsonData(stepItem) {
  const data = {};
  const titleInput = stepItem.querySelector('.step-title-input');
  const descriptionInput = stepItem.querySelector('.step-description');
  const legacyApiInput = stepItem.querySelector('.step-api-legacy');

  const title = titleInput?.value.trim();
  const desc = descriptionInput?.value.trim();
  const legacyApis = legacyApiInput?.value.trim();

  if (title) {
    data.title = title;
  }
  if (desc) {
    data.description = desc;
  }

  const substeps = [];
  stepItem.querySelectorAll('.substep-item').forEach(substepItem => {
    const subDesc = substepItem.querySelector('.substep-description')?.value.trim();
    const api2Str = substepItem.querySelector('.substep-api-2')?.value || '';
    const api1Str = substepItem.querySelector('.substep-api-1')?.value || '';

    const substepData = {};
    if (subDesc) {
      substepData.description = subDesc;
    }
    const api2List = api2Str.split(',').map(x => x.trim()).filter(Boolean);
    const api1List = api1Str.split(',').map(x => x.trim()).filter(Boolean);
    if (api2List.length > 0) {
      substepData.api2 = api2List;
    }
    if (api1List.length > 0) {
      substepData.api1 = api1List;
    }

    if (Object.keys(substepData).length > 0) {
      substeps.push(substepData);
    }
  });

  if (substeps.length > 0) {
    data.substeps = substeps;
  } else if (legacyApis) {
    const apiList = legacyApis.split(',').map(a => a.trim()).filter(Boolean);
    if (apiList.length > 0) {
      data.apis = apiList;
    }
  }

  return data;
}

function applyStepJsonData(stepItem, data) {
  const titleInput = stepItem.querySelector('.step-title-input');
  const descriptionInput = stepItem.querySelector('.step-description');
  const legacyApiInput = stepItem.querySelector('.step-api-legacy');
  const substepsContainer = stepItem.querySelector('.substeps-container');

  titleInput.value = data.title ?? '';
  descriptionInput.value = data.description ?? data.step ?? '';

  const legacyApis = data.apis ?? data.api;
  if (legacyApiInput) {
    if (Array.isArray(legacyApis)) {
      legacyApiInput.value = legacyApis.join(', ');
    } else if (typeof legacyApis === 'string') {
      legacyApiInput.value = legacyApis;
    } else {
      legacyApiInput.value = '';
    }
  }

  substepsContainer.innerHTML = '';

  if (Array.isArray(data.substeps) && data.substeps.length > 0) {
    data.substeps.forEach(sub => {
      const desc = sub?.description ?? '';
      const api2Val = Array.isArray(sub?.api2)
        ? sub.api2.join(', ')
        : (typeof sub?.api2 === 'string' ? sub.api2 : '');
      const api1Val = Array.isArray(sub?.api1)
        ? sub.api1.join(', ')
        : (typeof sub?.api1 === 'string' ? sub.api1 : '');

      const tempWrap = document.createElement('div');
      tempWrap.innerHTML = createSubstepHtml(desc, api2Val, api1Val);
      substepsContainer.appendChild(tempWrap.firstElementChild);
    });
  }
}
