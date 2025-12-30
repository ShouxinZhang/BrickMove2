import {
  importInput,
  uploadCsvInput,
  importBtn,
  pasteBtn,
  uploadCsvBtn,
  exportJsonBtn,
  exportMdBtn,
  exportCsvBtn,
  pasteModal,
  pasteTextarea
} from '../ui/dom.js';
import {
  getState,
  toSerializable,
  loadFromSerialized
} from '../core/state.js';
import { renderTreeNav } from '../ui/treeNav.js';
import { renderEditor } from '../ui/editor.js';
import { renderPreview } from '../ui/preview.js';
import { buildTreeMarkdown } from '../utils/markdown.js';
import { buildTreeCsv } from '../utils/csv.js';
import { syncTreePreviewWindow } from '../utils/treePreviewWindow.js';
import { renderBreadcrumb } from '../ui/breadcrumb.js';
import { uploadCsvFile } from '../../shared/uploadCsv.js';
import { saveCsvContent } from '../../shared/saveCsvContent.js';
import { saveJsonContent } from '../../shared/saveJsonContent.js';
import { saveMarkdownContent } from '../../shared/saveMarkdownContent.js';
import { getCsvTargetDir } from '../../shared/csvTargetDir.js';

export function initIoHandlers() {
  importBtn.addEventListener('click', () => {
    importInput.click();
  });

  if (pasteBtn) {
    pasteBtn.addEventListener('click', () => {
      openPasteModal();
    });
  }

  if (uploadCsvBtn) {
    uploadCsvBtn.addEventListener('click', saveTreeCsvToServer);
  }

  importInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isCsvFile(file.name)) {
      await saveCsvToServer(file, getCsvTargetDir());
      event.target.value = '';
      return;
    }

    const text = await file.text();
    try {
      await importFromText(text, file.name);
    } catch (error) {
      alert(`导入失败: ${error.message}`);
    }
    event.target.value = '';
  });

  exportJsonBtn.addEventListener('click', () => {
    const data = toSerializable();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'proof_tree.json');
  });

  exportMdBtn.addEventListener('click', () => {
    const { root } = getState();
    if (!root) return;
    const markdown = buildTreeMarkdown(root);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, 'proof_tree.md');
  });

  exportCsvBtn.addEventListener('click', () => {
    const { root } = getState();
    if (!root) return;
    const csv = buildTreeCsv(root);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'proof_tree.csv');
  });

  if (saveTreeJsonBtn) {
    saveTreeJsonBtn.addEventListener('click', saveJsonToServerFromTree);
  }
  if (saveTreeMdBtn) {
    saveTreeMdBtn.addEventListener('click', saveMarkdownToServerFromTree);
  }

  pasteModal.addEventListener('close', async () => {
    if (pasteModal.returnValue === 'confirm') {
      const raw = pasteTextarea.value.trim();
      if (!raw) return;
      try {
        await importFromText(raw);
      } catch (error) {
        alert(`导入失败: ${error.message}`);
      }
      pasteTextarea.value = '';
    } else {
      pasteTextarea.value = '';
    }
  });
}

export async function openPasteModal() {
  if (typeof pasteModal.showModal === 'function') {
    pasteModal.showModal();
  } else {
    const raw = window.prompt('粘贴 JSON 或 Markdown');
    if (raw) {
      try {
        await importFromText(raw);
      } catch (error) {
        alert(`导入失败: ${error.message}`);
      }
    }
  }
}

async function importFromText(text, filename = '') {
  try {
    const json = JSON.parse(text);
    await loadFromJson(json);
  } catch (jsonError) {
    // fallback: treat as markdown or legacy format
    if (/\.md$/i.test(filename) || text.includes('###')) {
      const proofJson = await convertMarkdownToProofJson(text);
      const treeData = transformLegacyProofToTree(proofJson);
      loadFromSerialized(treeData);
    } else {
      throw jsonError;
    }
  }
  renderTreeNav();
  renderEditor();
  renderPreview();
  renderBreadcrumb();
  syncTreePreviewWindow();
}

async function loadFromJson(json) {
  if (json && json.root) {
    loadFromSerialized(json);
    return;
  }
  if (json && json.theorem_id) {
    const treeData = transformLegacyProofToTree(json);
    loadFromSerialized(treeData);
    return;
  }
  throw new Error('无法识别的 JSON 结构');
}

async function convertMarkdownToProofJson(markdownText) {
  const response = await fetch('/api/convert-md-to-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown: markdownText })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Markdown 转换失败');
  }
  return payload.proof;
}

function transformLegacyProofToTree(proof) {
  const root = plainNode({
    id: proof.id || 'node-root',
    name: proof.theorem_id || '定理',
    symbols: proof.symbols,
    problem: proof.statement || ''
  });

  if (Array.isArray(proof.steps)) {
    proof.steps.forEach((step, index) => {
      const child = plainNode({
        id: `legacy-step-${index + 1}`,
        name: step.title || `步骤 ${index + 1}`,
        symbols: step.symbols,
        description: step.description || step.step || '',
        api2: step.substeps && step.substeps.length > 0 ? '' : arrayToCsv(step.apis || step.api)
      });

      if (Array.isArray(step.substeps) && step.substeps.length > 0) {
        child.children = step.substeps.map((substep, subIndex) => plainNode({
          id: `legacy-substep-${index + 1}-${subIndex + 1}`,
          name: substep.title || `子步骤 ${subIndex + 1}`,
          description: substep.description || '',
          api2: arrayToCsv(substep.api2),
          api1: arrayToCsv(substep.api1)
        }));
      }

      root.children.push(child);
    });
  }

  return { root };
}

function arrayToCsv(value) {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

function isCsvFile(name) {
  return /\.csv$/i.test(name);
}

async function saveCsvToServer(file, targetDir = getCsvTargetDir()) {
  try {
    const result = await uploadCsvFile(file, targetDir);
    alert(`CSV 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`CSV 保存失败: ${error.message}`);
  }
}

async function saveTreeCsvToServer() {
  const { root } = getState();
  if (!root) {
    alert('没有可保存的数据');
    return;
  }
  const csv = buildTreeCsv(root);
  try {
    const result = await saveCsvContent({
      content: csv,
      filename: 'proof_tree.csv',
      targetDir: getCsvTargetDir()
    });
    alert(`CSV 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`CSV 保存失败: ${error.message}`);
  }
}

async function saveJsonToServerFromTree() {
  const data = toSerializable();
  try {
    const result = await saveJsonContent({ json: data, filename: 'proof_tree.json', targetDir: getCsvTargetDir() });
    alert(`JSON 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`JSON 保存失败: ${error.message}`);
  }
}

async function saveMarkdownToServerFromTree() {
  const { root } = getState();
  if (!root) {
    alert('没有可保存的数据');
    return;
  }
  const markdown = buildTreeMarkdown(root);
  try {
    const result = await saveMarkdownContent({ content: markdown, filename: 'proof_tree.md', targetDir: getCsvTargetDir() });
    alert(`Markdown 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`Markdown 保存失败: ${error.message}`);
  }
}

function plainNode({
  id,
  name = '',
  symbols = '',
  problem = '',
  description = '',
  mathProof = '',
  api2 = '',
  api1 = '',
  children = []
} = {}) {
  return {
    id,
    name,
    symbols: Array.isArray(symbols) ? symbols.join(', ') : (symbols || ''),
    problem,
    description,
    mathProof,
    api2: arrayToCsv(api2),
    api1: arrayToCsv(api1),
    children: Array.isArray(children) ? children : []
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
