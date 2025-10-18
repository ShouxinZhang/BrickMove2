import { preview } from './dom.js';
import { collectData } from './steps/index.js';
import {
  buildMarkdownWithSegments,
  decoratePreview
} from './previewSync/index.js';

export function generateMarkdown(data) {
  const { markdown } = buildMarkdownWithSegments(data);
  return markdown;
}

export function renderPreview() {
  const data = collectData();
  const { markdown, segments } = buildMarkdownWithSegments(data);
  const html = marked.parse(markdown);
  preview.innerHTML = html;
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(preview, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
  applyLatexSpacingFallback(preview);
  decoratePreview(preview, segments);
}

function applyLatexSpacingFallback(root) {
  if (!root) {
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parentEl = node.parentElement;
    if (!parentEl) {
      continue;
    }
    if (parentEl.closest('code, pre, .katex')) {
      continue;
    }
    if (node.nodeValue && node.nodeValue.includes('\\,')) {
      targets.push(node);
    }
  }
  targets.forEach(node => {
    node.nodeValue = node.nodeValue.replace(/\\,/g, '\u2009');
  });
}
