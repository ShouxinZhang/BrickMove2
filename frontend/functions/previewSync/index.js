import { buildMarkdownWithSegments } from './segments.js';
import { applyPreviewSegments, getSegmentByIndex } from './mapping.js';
import { focusSegmentSource } from './navigation.js';

let interactionsInitialized = false;

export { buildMarkdownWithSegments };

export function decoratePreview(previewEl, segments) {
  applyPreviewSegments(previewEl, segments);
}

export function initPreviewInteractions(previewEl) {
  if (!previewEl || interactionsInitialized) {
    return;
  }

  previewEl.addEventListener('click', event => {
    if (event.button !== 0) {
      return;
    }
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    const targetNode = event.target instanceof Element
      ? event.target.closest('[data-preview-segment-index]')
      : null;
    if (!targetNode) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const rawIndex = targetNode.dataset.previewSegmentIndex;
    if (typeof rawIndex !== 'string' || rawIndex === '') {
      return;
    }
    const segment = getSegmentByIndex(Number(rawIndex));
    if (!segment) {
      return;
    }
    focusSegmentSource(segment);
  });

  interactionsInitialized = true;
}
