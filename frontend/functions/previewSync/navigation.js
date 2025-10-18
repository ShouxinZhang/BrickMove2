import {
  theoremTitle,
  theoremStatement,
  stepsContainer
} from '../core/dom.js';

export function focusSegmentSource(segment) {
  if (!segment || !segment.source) {
    return false;
  }

  const { source } = segment;
  let target = null;

  switch (source.kind) {
    case 'theoremTitle':
      target = theoremTitle;
      break;
    case 'theoremStatement':
      target = theoremStatement;
      break;
    case 'stepTitle':
      target = findInStep(source.stepIndex, '.step-title-input');
      break;
    case 'stepDescription':
      target = findInStep(source.stepIndex, '.step-description');
      break;
    case 'stepApi':
      target = findInStep(source.stepIndex, '.step-api-legacy');
      break;
    case 'substepDescription':
      target = findInSubstep(source.stepIndex, source.substepIndex, '.substep-description');
      break;
    case 'substepApi2':
      target = findInSubstep(source.stepIndex, source.substepIndex, '.substep-api-2');
      break;
    case 'substepApi1':
      target = findInSubstep(source.stepIndex, source.substepIndex, '.substep-api-1');
      break;
    default:
      target = null;
  }

  if (!target) {
    return false;
  }

  focusElement(target);
  return true;
}

function findInStep(stepIndex, selector) {
  const stepItem = getStepItem(stepIndex);
  if (!stepItem) {
    return null;
  }
  return stepItem.querySelector(selector);
}

function findInSubstep(stepIndex, substepIndex, selector) {
  const stepItem = getStepItem(stepIndex);
  if (!stepItem) {
    return null;
  }
  const substeps = stepItem.querySelectorAll('.substep-item');
  const substepItem = substeps[substepIndex];
  if (!substepItem) {
    return null;
  }
  return substepItem.querySelector(selector);
}

function getStepItem(stepIndex) {
  if (typeof stepIndex !== 'number' || stepIndex < 0) {
    return null;
  }
  const stepItems = stepsContainer.querySelectorAll('.step-item');
  return stepItems[stepIndex] || null;
}

function focusElement(element) {
  if (!element) {
    return;
  }

  element.scrollIntoView({ block: 'center', behavior: 'auto' });
  try {
    element.focus({ preventScroll: true });
  } catch (error) {
    element.focus();
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const length = element.value.length;
    try {
      element.setSelectionRange(length, length);
    } catch (error) {
      // Some inputs (e.g., type="button") do not support selection – safe to ignore.
    }
  }
}
