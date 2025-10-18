import { createPopper } from 'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/esm/popper.js';
import {
  apiListToggle,
  apiModal,
  apiModalClose,
  apiModalBody,
  apiListDiv
} from '../core/dom.js';

let isOpen = false;
let keydownHandlerAttached = false;
let popperInstance = null;
let pointerDownHandler = null;
let focusHandler = null;

export function initApiModal() {
  if (!apiListToggle || !apiModal || !apiModalBody) {
    return;
  }

  apiListToggle.setAttribute('aria-haspopup', 'dialog');
  apiListToggle.setAttribute('aria-expanded', 'false');
  apiListToggle.addEventListener('click', handleToggleClick);
  if (apiModalClose) {
    apiModalClose.addEventListener('click', closeModal);
  }
  if (!keydownHandlerAttached) {
    document.addEventListener('keydown', handleKeydown, true);
    keydownHandlerAttached = true;
  }

  refreshApiModalContent();
}

export function refreshApiModalContent() {
  if (!apiModalBody || !apiListDiv) {
    return;
  }
  apiModalBody.innerHTML = apiListDiv.innerHTML;
  if (isOpen && popperInstance) {
    popperInstance.update();
  }
}

function handleToggleClick(event) {
  if (isOpen) {
    closeModal();
  } else {
    openModal();
  }
}

function openModal() {
  refreshApiModalContent();
  apiModal.classList.remove('hidden');
  apiListToggle.setAttribute('aria-expanded', 'true');
  if (!popperInstance) {
    popperInstance = createPopper(apiListToggle, apiModal, {
      placement: 'bottom-end',
      strategy: 'fixed',
      modifiers: [
        {
          name: 'offset',
          options: { offset: [0, 8] }
        },
        {
          name: 'preventOverflow',
          options: { padding: 12 }
        },
        {
          name: 'flip',
          options: { fallbackPlacements: ['bottom-start', 'top-end', 'top-start'] }
        }
      ]
    });
  } else {
    popperInstance.update();
  }

  isOpen = true;
  attachDismissHandlers();
  requestAnimationFrame(() => {
    apiModal.focus();
  });
}

function closeModal() {
  if (!isOpen) {
    return;
  }
  apiModal.classList.add('hidden');
  apiListToggle.setAttribute('aria-expanded', 'false');
  isOpen = false;
  detachDismissHandlers();
}

function handleKeydown(event) {
  if (!isOpen) {
    return;
  }
  if (event.key === 'Escape') {
    closeModal();
    apiListToggle.focus();
  }
}

function attachDismissHandlers() {
  if (!pointerDownHandler) {
    pointerDownHandler = event => {
      const target = event.target;
      if (apiModal.contains(target) || apiListToggle.contains(target)) {
        return;
      }
      closeModal();
    };
    document.addEventListener('pointerdown', pointerDownHandler, true);
  }

  if (!focusHandler) {
    focusHandler = event => {
      const target = event.target;
      if (apiModal.contains(target) || apiListToggle.contains(target)) {
        return;
      }
      closeModal();
    };
    document.addEventListener('focusin', focusHandler);
  }
}

function detachDismissHandlers() {
  if (pointerDownHandler) {
    document.removeEventListener('pointerdown', pointerDownHandler, true);
    pointerDownHandler = null;
  }
  if (focusHandler) {
    document.removeEventListener('focusin', focusHandler);
    focusHandler = null;
  }
}
