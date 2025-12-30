const STORAGE_KEY = 'csvTargetDir';
let isLoaded = false;
let cachedValue = '';

function normalize(value) {
  return value ? value.trim() : '';
}

export function loadCsvTargetDir() {
  if (isLoaded) {
    return cachedValue;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    cachedValue = normalize(stored);
  } catch (error) {
    console.warn('无法读取 CSV 保存路径配置：', error);
    cachedValue = '';
  }
  isLoaded = true;
  return cachedValue;
}

export function getCsvTargetDir() {
  if (!isLoaded) {
    loadCsvTargetDir();
  }
  return cachedValue;
}

export function setCsvTargetDir(next) {
  const normalized = normalize(next);
  cachedValue = normalized;
  isLoaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch (error) {
    console.warn('无法保存 CSV 保存路径配置：', error);
  }
  return cachedValue;
}
