import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/modular/sortable.esm.js';
import { renumberSteps } from '../steps/stepElements.js';
import { nextSubstepId } from '../core/state.js';

let toggleButton = null;
let panelElement = null;
let stepsListElement = null;
let appRootElement = null;
let stepsContainerElement = null;
let onStructureChanged = () => {};
let initialized = false;
let isOpen = false;
let stepsSortable = null;
const substepSortables = new Map();

export function initToc({
  toggle,
  panel,
  stepsList,
  appRoot,
  stepsContainer,
  onStructureChange = () => {}
}) {
  toggleButton = toggle;
  panelElement = panel;
  stepsListElement = stepsList;
  appRootElement = appRoot;
  stepsContainerElement = stepsContainer;
  onStructureChanged = onStructureChange;

  if (!toggleButton || !panelElement || !stepsListElement || !appRootElement || !stepsContainerElement) {
    console.warn('TOC initialization skipped: missing DOM references');
    return;
  }

  toggleButton.addEventListener('click', handleToggle);
  toggleButton.setAttribute('aria-expanded', 'false');
  initialized = true;
  refreshToc();
}

export function refreshToc() {
  if (!initialized || !stepsListElement || !stepsContainerElement) {
    return;
  }

  destroySortables();
  renderToc();
  setupSortables();
}

function handleToggle() {
  isOpen = !isOpen;
  const expanded = isOpen ? 'true' : 'false';
  toggleButton.setAttribute('aria-expanded', expanded);
  if (isOpen) {
    appRootElement.classList.add('toc-open');
    refreshToc();
  } else {
    appRootElement.classList.remove('toc-open');
  }
}

function renderToc() {
  const fragment = document.createDocumentFragment();
  const stepItems = Array.from(stepsContainerElement.querySelectorAll('.step-item'));

  if (stepItems.length === 0) {
    stepsListElement.innerHTML = '';
    return;
  }

  stepItems.forEach((stepItem, index) => {
    const stepId = stepItem.dataset.stepId || '';
    const stepRow = buildStepRow(stepItem, index, stepId);
    fragment.appendChild(stepRow);
  });

  stepsListElement.innerHTML = '';
  stepsListElement.appendChild(fragment);
}

function buildStepRow(stepItem, index, stepId) {
  const li = document.createElement('li');
  li.className = 'toc-step';
  li.dataset.stepId = stepId;

  const header = document.createElement('div');
  header.className = 'toc-step-row';

  const indexSpan = document.createElement('span');
  indexSpan.className = 'toc-step-index';
  indexSpan.textContent = `步骤 ${index + 1}`;

  const titleSpan = document.createElement('span');
  titleSpan.className = 'toc-step-title';
  titleSpan.textContent = deriveStepLabel(stepItem);
  titleSpan.title = titleSpan.textContent;
  titleSpan.addEventListener('click', () => focusStep(stepItem));

  const handle = document.createElement('span');
  handle.className = 'toc-step-handle';
  handle.textContent = '⋮⋮';

  header.appendChild(indexSpan);
  header.appendChild(titleSpan);
  header.appendChild(handle);
  li.appendChild(header);

  const substepList = document.createElement('ul');
  substepList.className = 'toc-substep-list';
  substepList.dataset.stepId = stepId;

  const substepItems = Array.from(stepItem.querySelectorAll('.substep-item'));
  substepItems.forEach((substepItem, subIndex) => {
    const substepLi = buildSubstepRow(substepItem, subIndex);
    substepList.appendChild(substepLi);
  });

  li.appendChild(substepList);
  return li;
}

function buildSubstepRow(substepItem, index) {
  ensureSubstepId(substepItem);
  const substepId = substepItem.dataset.substepId || '';
  const li = document.createElement('li');
  li.className = 'toc-substep';
  li.dataset.substepId = substepId;

  const handle = document.createElement('span');
  handle.className = 'toc-substep-handle';
  handle.textContent = '⋮';

  const label = document.createElement('span');
  label.className = 'toc-substep-label';
  label.textContent = deriveSubstepLabel(substepItem, index);
  label.title = label.textContent;
  label.addEventListener('click', () => focusSubstep(substepItem));

  li.appendChild(handle);
  li.appendChild(label);
  return li;
}

function setupSortables() {
  if (!stepsListElement) {
    return;
  }

  if (stepsListElement.children.length > 0) {
    stepsSortable = new Sortable(stepsListElement, {
      animation: 150,
      handle: '.toc-step-handle',
      ghostClass: 'dragging',
      onEnd: handleStepsReordered
    });
  }

  stepsListElement.querySelectorAll('.toc-substep-list').forEach(listEl => {
    if (!(listEl instanceof HTMLElement)) {
      return;
    }
    if (listEl.children.length === 0) {
      return;
    }

    const sortable = new Sortable(listEl, {
      animation: 150,
      handle: '.toc-substep-handle',
      ghostClass: 'dragging',
      onEnd: () => handleSubstepsReordered(listEl)
    });

    substepSortables.set(listEl.dataset.stepId || '', sortable);
  });
}

function destroySortables() {
  if (stepsSortable) {
    stepsSortable.destroy();
    stepsSortable = null;
  }
  substepSortables.forEach(sortable => sortable.destroy());
  substepSortables.clear();
}

function handleStepsReordered() {
  if (!stepsContainerElement) {
    return;
  }
  const orderIds = Array.from(stepsListElement.children).map(li => li.dataset.stepId).filter(Boolean);
  if (orderIds.length === 0) {
    return;
  }
  const fragment = document.createDocumentFragment();
  orderIds.forEach(id => {
    const stepDom = stepsContainerElement.querySelector(`.step-item[data-step-id="${id}"]`);
    if (stepDom) {
      fragment.appendChild(stepDom);
    }
  });
  stepsContainerElement.appendChild(fragment);
  renumberSteps(stepsContainerElement);
  propagateStructureChange();
}

function handleSubstepsReordered(listElement) {
  const stepId = listElement.dataset.stepId;
  if (!stepId || !stepsContainerElement) {
    return;
  }
  const stepItem = stepsContainerElement.querySelector(`.step-item[data-step-id="${stepId}"]`);
  if (!stepItem) {
    return;
  }
  const substepsContainer = stepItem.querySelector('.substeps-container');
  if (!substepsContainer) {
    return;
  }

  const orderIds = Array.from(listElement.children).map(li => li.dataset.substepId).filter(Boolean);
  if (orderIds.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  orderIds.forEach(id => {
    const substepDom = substepsContainer.querySelector(`.substep-item[data-substep-id="${id}"]`);
    if (substepDom) {
      fragment.appendChild(substepDom);
    }
  });

  substepsContainer.appendChild(fragment);
  propagateStructureChange();
}

function propagateStructureChange() {
  if (!stepsContainerElement) {
    return;
  }
  const evt = new Event('input', { bubbles: true });
  stepsContainerElement.dispatchEvent(evt);
  onStructureChanged();
}

function ensureSubstepId(substepItem) {
  if (substepItem.dataset.substepId) {
    return;
  }
  substepItem.dataset.substepId = nextSubstepId();
}

function deriveStepLabel(stepItem) {
  const titleInput = stepItem.querySelector('.step-title-input');
  const descInput = stepItem.querySelector('.step-description');
  const title = titleInput?.value.trim();
  if (title) {
    return title;
  }
  const description = descInput?.value.trim();
  if (description) {
    return truncateText(description);
  }
  return '（未命名步骤）';
}

function deriveSubstepLabel(substepItem, index) {
  const descTextarea = substepItem.querySelector('.substep-description');
  const text = descTextarea?.value.trim();
  if (text) {
    return truncateText(text);
  }
  return `子步骤 ${index + 1}`;
}

function truncateText(text, maxLength = 32) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function focusStep(stepItem) {
  const titleInput = stepItem.querySelector('.step-title-input');
  if (titleInput) {
    titleInput.focus();
    titleInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  stepItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function focusSubstep(substepItem) {
  const textarea = substepItem.querySelector('.substep-description');
  if (textarea) {
    textarea.focus();
    textarea.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  substepItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
