import { fileInput } from './dom.js';
import { state } from './state.js';
import { loadProofJson } from './steps/index.js';
import { renderPreview } from './render.js';
import { updateApiStats } from './api.js';

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
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    width: 90%;
    max-width: 700px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  `;
  
  modalContent.innerHTML = `
    <h3 style="margin: 0 0 16px 0;">粘贴 JSON 内容</h3>
    <textarea id="jsonTextInput" style="
      flex: 1;
      font-family: ui-monospace, monospace;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      resize: none;
      min-height: 400px;
    " placeholder='{
  "theorem_id": "...",
  "statement": "...",
  "steps": [...]
}'></textarea>
    <div style="display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end;">
      <button id="cancelBtn" style="
        padding: 8px 16px;
        background: #9ca3af;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">取消</button>
      <button id="loadBtn" style="
        padding: 8px 16px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">加载</button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  const textarea = document.getElementById('jsonTextInput');
  const cancelBtn = document.getElementById('cancelBtn');
  const loadBtn = document.getElementById('loadBtn');
  
  textarea.focus();
  
  cancelBtn.onclick = () => document.body.removeChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) document.body.removeChild(modal);
  };
  
  loadBtn.onclick = () => {
    const jsonText = textarea.value.trim();
    if (!jsonText) {
      alert('请输入 JSON 内容');
      return;
    }
    
    try {
      const json = JSON.parse(jsonText);
      loadProofJson(json);
      updateApiStats();
      document.body.removeChild(modal);
    } catch (err) {
      alert('解析 JSON 失败：' + err.message);
    }
  };
}

