import { stepsContainer, theoremTitle, theoremStatement } from '../dom.js';
import { resetSteps } from '../state.js';
import { createSubstepHtml } from './substepElements.js';
import { createStepElement, renumberSteps } from './stepElements.js';
import { openStepJsonEditor } from './jsonEditor.js';

let renderCallback = () => {};

export function initSteps(onRender) {
  renderCallback = onRender;
  stepsContainer.addEventListener('click', handleStepAreaClick);
}

function handleStepAreaClick(event) {
  const insertFirstBtn = event.target.closest('.insert-step-before-btn');
  if (insertFirstBtn) {
    const stepItem = insertFirstBtn.closest('.step-item');
    if (stepItem) {
      insertStepBefore(stepItem);
    }
    return;
  }

  const insertStepBtn = event.target.closest('.insert-step-btn');
  if (insertStepBtn) {
    const stepItem = insertStepBtn.closest('.step-item');
    if (stepItem) {
      insertStepAfter(stepItem);
    }
    return;
  }

  const removeButton = event.target.closest('.remove-btn');
  if (removeButton) {
    const stepItem = removeButton.closest('.step-item');
    const substepItem = removeButton.closest('.substep-item');

    if (substepItem) {
      substepItem.remove();
      renderCallback();
      triggerRecompute();
    } else if (stepItem) {
      stepItem.remove();
      if (!stepsContainer.querySelector('.step-item')) {
        addStep();
      } else {
        renderCallback();
        triggerRecompute();
      }
    }
    return;
  }

  const insertSubstepBtn = event.target.closest('.insert-substep-btn');
  if (insertSubstepBtn) {
    const substepItem = insertSubstepBtn.closest('.substep-item');
    if (substepItem) {
      const newSubstepDiv = document.createElement('div');
      newSubstepDiv.innerHTML = createSubstepHtml();
      substepItem.insertAdjacentElement('afterend', newSubstepDiv.firstElementChild);
      renderCallback();
      triggerRecompute();
    }
    return;
  }

  const insertSubstepBeforeBtn = event.target.closest('.insert-substep-before-btn');
  if (insertSubstepBeforeBtn) {
    const substepItem = insertSubstepBeforeBtn.closest('.substep-item');
    if (substepItem) {
      const newSubstepDiv = document.createElement('div');
      newSubstepDiv.innerHTML = createSubstepHtml();
      substepItem.insertAdjacentElement('beforebegin', newSubstepDiv.firstElementChild);
      renderCallback();
      triggerRecompute();
      const focusTarget = substepItem.previousElementSibling?.querySelector('.substep-description');
      if (focusTarget) {
        focusTarget.focus();
      }
    }
    return;
  }

  const editStepBtn = event.target.closest('.edit-step-json-btn');
  if (editStepBtn) {
    const stepItem = editStepBtn.closest('.step-item');
    if (stepItem) {
      openStepJsonEditor(stepItem, {
        onApply: () => {
          renderCallback();
          triggerRecompute();
        }
      });
    }
  }
}

export function addStep(stepText = '', apiText = '', stepTitle = '', substeps = []) {
  const stepDiv = createStepElement(stepText, apiText, stepTitle, substeps);
  stepsContainer.appendChild(stepDiv);
  renderCallback();
  triggerRecompute();
}

function insertStepAfter(stepItem) {
  const stepDiv = createStepElement();
  stepItem.insertAdjacentElement('afterend', stepDiv);
  renderCallback();
  triggerRecompute();
  const focusTarget = stepDiv.querySelector('.step-title-input');
  if (focusTarget) {
    focusTarget.focus();
  }
}

function insertStepBefore(stepItem) {
  const stepDiv = createStepElement();
  stepItem.insertAdjacentElement('beforebegin', stepDiv);
  renderCallback();
  triggerRecompute();
  const focusTarget = stepDiv.querySelector('.step-title-input');
  if (focusTarget) {
    focusTarget.focus();
  }
}

function triggerRecompute() {
  renumberSteps(stepsContainer);
  const evt = new Event('input', { bubbles: true });
  stepsContainer.dispatchEvent(evt);
}

export function loadProofJson(data) {
  stepsContainer.innerHTML = '';
  resetSteps();
  theoremTitle.value = data.theorem_id || '';
  theoremStatement.value = data.statement || '';

  let addedAny = false;
  if (Array.isArray(data.steps) && data.steps.length > 0) {
    data.steps.forEach(step => {
      const apiStr = Array.isArray(step.apis) ? step.apis.join(', ') : (step.api || '');
      const substeps = step.substeps || [];
      addStep(step.description || '', apiStr, step.title || '', substeps);
    });
    addedAny = true;
  }
  if (!addedAny) {
    addStep();
  }
}

export function collectData() {
  const steps = [];
  stepsContainer.querySelectorAll('.step-item').forEach(step => {
    const stepTitleInput = step.querySelector('.step-title-input');
    const stepDescription = step.querySelector('.step-description');
    const legacyApiInput = step.querySelector('.step-api-legacy');

    const substeps = [];
    step.querySelectorAll('.substep-item').forEach(substepItem => {
      const substepDesc = substepItem.querySelector('.substep-description');
      const substepApi2 = substepItem.querySelector('.substep-api-2');
      const substepApi1 = substepItem.querySelector('.substep-api-1');

      substeps.push({
        description: substepDesc.value.trim(),
        api2: substepApi2.value.trim(),
        api1: substepApi1.value.trim()
      });
    });

    steps.push({
      title: stepTitleInput.value.trim(),
      step: stepDescription.value.trim(),
      api: legacyApiInput.value.trim(),
      substeps
    });
  });

  return {
    title: theoremTitle.value.trim(),
    statement: theoremStatement.value.trim(),
    steps
  };
}
