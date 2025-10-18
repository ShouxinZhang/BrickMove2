import { fileInput } from './dom.js';
import { state } from './state.js';
import { loadProofJson } from './steps/index.js';
import { renderPreview } from './render.js';
import { updateApiStats } from './api.js';

let jsonPasteDialog = null;
let jsonPasteForm = null;
let jsonTextarea = null;

export function initJsonLoader() {
  fileInput.addEventListener('change', handleProofJsonChange);
}

function handleProofJsonChange(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  state.currentFileName = file.name;

  if (!file.name.endsWith('.json')) {
    alert('请上传 JSON 格式的 proof template 文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = content => {
    try {
      const data = JSON.parse(content.target.result);
      loadProofJson(data);
      updateApiStats();
    } catch (error) {
      alert(`JSON 解析错误: ${error.message}`);
      renderPreview();
    }
  };
  reader.readAsText(file);
}

export function showJsonInputModal() {
  ensureDialog();
  if (!jsonPasteDialog.open) {
    jsonPasteDialog.showModal();
    if (jsonTextarea) {
      jsonTextarea.value = '';
      requestAnimationFrame(() => jsonTextarea?.focus());
    }
  }
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
  title.textContent = '粘贴 JSON 内容';
  form.appendChild(title);

  jsonTextarea = document.createElement('textarea');
  jsonTextarea.className = 'json-input-textarea';
  jsonTextarea.placeholder = `{
  "theorem_id": "...",
  "statement": "...",
  "steps": [...]
}`;
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

  form.addEventListener('submit', event => {
    event.preventDefault();
    handleJsonPasteSubmit();
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
}

function handleJsonPasteSubmit() {
  if (!jsonTextarea) {
    return;
  }
  const jsonText = jsonTextarea.value.trim();
  if (!jsonText) {
    alert('请输入 JSON 内容');
    return;
  }

  try {
    const json = JSON.parse(jsonText);
    loadProofJson(json);
    updateApiStats();
    jsonPasteForm?.reset();
    jsonPasteDialog.close();
  } catch (err) {
    alert('解析 JSON 失败：' + err.message);
  }
}
