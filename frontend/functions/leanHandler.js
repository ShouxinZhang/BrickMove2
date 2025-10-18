import { leanInput, leanApiList, checkApiBtn } from './dom.js';
import {
  applyExtractedApis,
  showApiError,
  resetExtractedApis,
  clearApiCheckResult
} from './api.js';

export function initLeanHandler() {
  leanInput.addEventListener('change', handleLeanFileChange);
}

function handleLeanFileChange(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  clearApiCheckResult();

  if (file.name.endsWith('.json')) {
    checkApiBtn.disabled = true;
    readApiJson(file);
    return;
  }

  if (file.name.endsWith('.lean')) {
    checkApiBtn.disabled = true;
    readLeanSource(file);
    return;
  }

  showApiError('请上传 .json 或 .lean 文件');
}

function readApiJson(file) {
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.success && Array.isArray(data.apis)) {
        applyExtractedApis(data.apis);
      } else {
        const message = data.error || 'Invalid JSON format';
        showApiError(message);
      }
    } catch (error) {
      showApiError(`JSON 解析错误: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function readLeanSource(file) {
  leanApiList.innerHTML = '<small style="color: #3b82f6;">⏳ 正在提取 API...</small>';
  const reader = new FileReader();
  reader.onload = async event => {
    try {
      const code = event.target.result;
      const response = await fetch('/api/extract-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        showApiError(`服务器返回状态 ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.apis)) {
        applyExtractedApis(data.apis);
      } else {
        showApiError(data.error || '提取 API 失败');
      }
    } catch (error) {
      showApiError(`服务器错误: ${error.message}`);
    }
  };
  reader.readAsText(file);
}
