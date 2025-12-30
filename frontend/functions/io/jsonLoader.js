import { fileInput, csvUploadInput, csvUploadBtn, saveAllBtn, openHistoryBtn, historyDialog, historyList } from '../core/dom.js';
import { state } from '../core/state.js';
import { loadProofJson } from '../steps/index.js';
import { updateApiStats } from '../apiPanel/api.js';
import { uploadCsvFile } from '../../shared/uploadCsv.js';
import { saveCsvContent } from '../../shared/saveCsvContent.js';
import { saveJsonContent } from '../../shared/saveJsonContent.js';
import { saveMarkdownContent } from '../../shared/saveMarkdownContent.js';
import { getEditorCsv } from './csv.js';
import { getEditorMarkdown } from './markdownExport.js';
import { buildEditorJson } from './save.js';
import { getCsvTargetDir } from '../../shared/csvTargetDir.js';
import { listSavedFiles, readSavedFile } from '../../shared/historyApi.js';
import { getCsvTargetDir } from '../../shared/csvTargetDir.js';

const JSON_PLACEHOLDER = `{
  "theorem_id": "...",
  "statement": "...",
  "steps": [...]
}`;

const MARKDOWN_PLACEHOLDER = `### 定理 100

定理陈述...

---

### 证明

### Step 1: 描述
步骤总体说明

- 子步骤说明
  - API (2分): \`Foo\`
  - API (1分): \`Bar\`
`;

let jsonPasteDialog = null;
let jsonPasteForm = null;
let jsonTextarea = null;
let jsonTabButton = null;
let markdownTabButton = null;
let inputMode = 'json';

export function initJsonLoader() {
  if (!fileInput) {
    return;
  }
  fileInput.addEventListener('change', handleProofFileChange);

  if (csvUploadBtn) {
    csvUploadBtn.addEventListener('click', handleSaveCsvToServer);
  }

  if (saveAllBtn) {
    saveAllBtn.addEventListener('click', handleSaveAllToServer);
  }
  if (openHistoryBtn) {
    openHistoryBtn.addEventListener('click', openHistory);
  }
}

async function handleProofFileChange(event) {
  const input = event.target;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  // Note: CSV files are not handled through the import input anymore.

  const reader = new FileReader();

  reader.onerror = () => {
    alert('读取文件失败，请重试');
    input.value = '';
  };

  reader.onload = async loadEvent => {
    const text = loadEvent?.target?.result;
    if (typeof text !== 'string') {
      alert('无法读取文件内容');
      input.value = '';
      return;
    }

    try {
      if (isJsonFile(file.name)) {
        const data = JSON.parse(text);
        applyLoadedProof(data, file.name);
      } else if (isMarkdownFile(file.name)) {
        const proof = await convertMarkdownToJson(text);
        applyLoadedProof(proof, file.name);
      } else {
        alert('请上传 JSON 或 Markdown 格式的 proof template 文件');
      }
    } catch (error) {
      alert(`解析失败：${error.message}`);
    } finally {
      input.value = '';
    }
  };

  reader.readAsText(file);
}

export function showJsonInputModal() {
  ensureDialog();
  if (!jsonPasteDialog.open) {
    jsonPasteDialog.showModal();
  }
  setInputMode(inputMode, { resetValue: true });
  requestAnimationFrame(() => jsonTextarea?.focus());
}

function ensureDialog() {
  if (jsonPasteDialog) {
    return;
  }

  jsonPasteDialog = document.createElement('dialog');
  jsonPasteDialog.className = 'json-input-dialog';

  const form = document.createElement('form');
  form.className = 'json-input-form';
  jsonPasteForm = form;

  const title = document.createElement('h3');
  title.textContent = '粘贴 JSON / Markdown 内容';
  form.appendChild(title);

  const tabs = document.createElement('div');
  tabs.className = 'json-input-tabs';

  jsonTabButton = document.createElement('button');
  jsonTabButton.type = 'button';
  jsonTabButton.className = 'json-input-tab';
  jsonTabButton.textContent = '粘贴 JSON';
  jsonTabButton.addEventListener('click', () => setInputMode('json', { resetValue: true }));

  markdownTabButton = document.createElement('button');
  markdownTabButton.type = 'button';
  markdownTabButton.className = 'json-input-tab';
  markdownTabButton.textContent = '粘贴 Markdown';
  markdownTabButton.addEventListener('click', () => setInputMode('markdown', { resetValue: true }));

  tabs.appendChild(jsonTabButton);
  tabs.appendChild(markdownTabButton);
  form.appendChild(tabs);

  jsonTextarea = document.createElement('textarea');
  jsonTextarea.className = 'json-input-textarea';
  jsonTextarea.spellcheck = false;
  form.appendChild(jsonTextarea);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'json-input-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '取消';
  cancelBtn.className = 'json-input-cancel';

  const loadBtn = document.createElement('button');
  loadBtn.type = 'submit';
  loadBtn.textContent = '加载';
  loadBtn.className = 'json-input-confirm';

  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(loadBtn);
  form.appendChild(buttonRow);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    await handleJsonPasteSubmit();
  });

  cancelBtn.addEventListener('click', () => {
    jsonPasteForm?.reset();
    jsonPasteDialog.close();
  });

  jsonPasteDialog.addEventListener('cancel', () => {
    jsonPasteForm?.reset();
  });

  jsonPasteDialog.appendChild(form);
  document.body.appendChild(jsonPasteDialog);

  setInputMode('json', { resetValue: true });
}

async function handleJsonPasteSubmit() {
  if (!jsonTextarea) {
    return;
  }

  const rawText = jsonTextarea.value.trim();
  if (!rawText) {
    alert('请输入内容');
    return;
  }

  try {
    if (inputMode === 'json') {
      const json = JSON.parse(rawText);
      applyLoadedProof(json, 'pasted.json');
    } else {
      const proof = await convertMarkdownToJson(rawText);
      applyLoadedProof(proof, 'pasted.md');
    }
    jsonPasteForm?.reset();
    jsonPasteDialog.close();
  } catch (error) {
    alert('解析失败：' + error.message);
  }
}

function applyLoadedProof(data, sourceName) {
  loadProofJson(data);
  updateApiStats();
  if (sourceName) {
    state.currentFileName = sourceName;
  }
}

async function convertMarkdownToJson(markdownText) {
  let response;
  try {
    response = await fetch('/api/convert-md-to-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ markdown: markdownText })
    });
  } catch (networkError) {
    throw new Error('网络请求失败，请检查连接');
  }

  let payload;
  try {
    payload = await response.json();
  } catch (parseError) {
    throw new Error('服务器返回了无法解析的响应');
  }

  if (!response.ok || !payload?.success) {
    const detail = Array.isArray(payload?.details)
      ? payload.details.join('\n')
      : payload?.details;
    const message = detail || payload?.error || 'Markdown 转换失败';
    throw new Error(message);
  }

  return payload.proof;
}

function setInputMode(mode, { resetValue = false } = {}) {
  if (mode !== 'json' && mode !== 'markdown') {
    return;
  }

  const previousMode = inputMode;
  inputMode = mode;

  if (jsonTabButton) {
    jsonTabButton.classList.toggle('is-active', mode === 'json');
    jsonTabButton.setAttribute('aria-pressed', String(mode === 'json'));
  }
  if (markdownTabButton) {
    markdownTabButton.classList.toggle('is-active', mode === 'markdown');
    markdownTabButton.setAttribute('aria-pressed', String(mode === 'markdown'));
  }

  if (jsonTextarea) {
    updateTextareaPlaceholder(mode);
    if (resetValue || previousMode !== mode) {
      jsonTextarea.value = '';
    }
  }
}

function updateTextareaPlaceholder(mode) {
  if (!jsonTextarea) {
    return;
  }
  jsonTextarea.placeholder = mode === 'json' ? JSON_PLACEHOLDER : MARKDOWN_PLACEHOLDER;
}

function isJsonFile(name) {
  return /\.json$/i.test(name);
}

function isMarkdownFile(name) {
  return /\.md$/i.test(name) || /\.markdown$/i.test(name);
}

function isCsvFile(name) {
  return /\.csv$/i.test(name);
}

async function handleCsvUploadChange(event) {
  const input = event.target;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  try {
    const result = await uploadCsvFile(file, getCsvTargetDir());
    alert(`CSV 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`CSV 保存失败：${error.message}`);
  } finally {
    input.value = '';
  }
}

async function handleSaveCsvToServer() {
  try {
    const { csvContent, filename } = getEditorCsv();
    const result = await saveCsvContent({
      content: csvContent,
      filename,
      targetDir: getCsvTargetDir()
    });
    alert(`CSV 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`CSV 保存失败：${error.message}`);
  }
}

async function handleSaveJsonToServer() {
  try {
    const { json, filename } = buildEditorJson();
    const result = await saveJsonContent({ json, filename, targetDir: getCsvTargetDir() });
    alert(`JSON 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`JSON 保存失败：${error.message}`);
  }
}

async function handleSaveMdToServer() {
  try {
    const { markdown, filename } = getEditorMarkdown();
    const result = await saveMarkdownContent({ content: markdown, filename, targetDir: getCsvTargetDir() });
    alert(`Markdown 已保存到: ${result.path || result.absolute_path}`);
  } catch (error) {
    alert(`Markdown 保存失败：${error.message}`);
  }
}

async function handleSaveAllToServer() {
  try {
    const targetDir = getCsvTargetDir();
    const { csvContent, filename: csvName } = getEditorCsv();
    const { markdown, filename: mdName } = getEditorMarkdown();
    const { json, filename: jsonName } = buildEditorJson();
    // Build timestamped base name: proof_YYYYMMDDHHmmss
    const ts = buildTimestamp();
    const base = `proof_${ts}`;
    const results = [];
    results.push(await saveCsvContent({ content: csvContent, filename: `${base}.csv`, targetDir }));
    results.push(await saveMarkdownContent({ content: markdown, filename: `${base}.md`, targetDir }));
    results.push(await saveJsonContent({ json, filename: `${base}.json`, targetDir }));
    alert('已保存: ' + results.map(r => r.path || r.absolute_path).join('\n'));
  } catch (error) {
    alert(`保存失败：${error.message}`);
  }
}

function buildTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function openHistory() {
  try {
    const items = await listSavedFiles(getCsvTargetDir());
    renderHistoryList(items);
    historyDialog?.showModal();
  } catch (error) {
    alert(`读取历史失败：${error.message}`);
  }
}

function renderHistoryList(items) {
  if (!historyList) return;
  historyList.innerHTML = '';
  const container = document.createElement('div');
  items.forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 10px';
    row.style.borderBottom = '1px solid #e5e7eb';
    const name = document.createElement('span');
    name.textContent = item.name;
    const meta = document.createElement('span');
    const date = new Date(item.mtime * 1000).toLocaleString();
    meta.textContent = `${item.ext} • ${Math.round(item.size/1024)}KB • ${date}`;
    row.appendChild(name);
    row.appendChild(meta);
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => loadHistoryItem(item));
    container.appendChild(row);
  });
  historyList.appendChild(container);
}

async function loadHistoryItem(item) {
  if (!item?.path) return;
  try {
    const file = await readSavedFile(item.path);
    const ext = (file.ext || '').toLowerCase();
    if (ext === '.json') {
      const data = JSON.parse(file.content);
      applyLoadedProof(data, item.name);
    } else if (ext === '.md' || ext === '.markdown') {
      const proof = await convertMarkdownToJson(file.content);
      applyLoadedProof(proof, item.name);
    } else if (ext === '.csv') {
      alert('CSV 历史文件可查看，但不支持直接载入为编辑内容。');
    } else {
      alert('暂不支持的文件类型');
    }
    historyDialog?.close();
  } catch (error) {
    alert(`加载失败：${error.message}`);
  }
}
