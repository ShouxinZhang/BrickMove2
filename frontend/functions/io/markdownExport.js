import { collectData } from '../steps/index.js';
import { generateMarkdown } from '../render.js';

export function initMarkdownExport(button) {
  if (!button) {
    return;
  }

  button.addEventListener('click', () => {
    const { markdown, filename } = getEditorMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  });
}

export function getEditorMarkdown() {
  const data = collectData();
  const markdown = generateMarkdown(data);
  const filename = buildFilename(data.title);
  return { markdown, filename };
}

function buildFilename(title) {
  const base = title && title.trim() !== '' ? title.trim() : 'proof';
  return `${sanitizeFilename(base)}.md`;
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}
