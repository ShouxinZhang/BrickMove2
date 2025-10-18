import {
  apiListToggle,
  apiModal,
  apiModalClose,
  apiModalBody,
  apiListDiv
} from './dom.js';

let isOpen = false;
let keydownHandlerAttached = false;

export function initApiModal() {
  if (!apiListToggle || !apiModal || !apiModalBody) {
    return;
  }

  apiListToggle.setAttribute('aria-expanded', 'false');
  apiListToggle.addEventListener('click', openModal);
  if (apiModalClose) {
    apiModalClose.addEventListener('click', closeModal);
  }
  apiModal.addEventListener('click', event => {
    if (event.target === apiModal) {
      closeModal();
    }
  });
  if (!keydownHandlerAttached) {
    document.addEventListener('keydown', handleKeydown);
    keydownHandlerAttached = true;
  }
  refreshApiModalContent();
}

export function refreshApiModalContent() {
  if (!apiModalBody || !apiListDiv) {
    return;
  }
  apiModalBody.innerHTML = apiListDiv.innerHTML;
}

function openModal() {
  refreshApiModalContent();
  apiModal.classList.remove('hidden');
  apiListToggle.setAttribute('aria-expanded', 'true');
  isOpen = true;
}

function closeModal() {
  apiModal.classList.add('hidden');
  apiListToggle.setAttribute('aria-expanded', 'false');
  isOpen = false;
}

function handleKeydown(event) {
  if (!isOpen) {
    return;
  }
  if (event.key === 'Escape') {
    closeModal();
  }
}
