const STORAGE_KEY = 'proofTreeSettings';
const DEFAULT_SETTINGS = {
  confirmDelete: true
};

let settings = { ...DEFAULT_SETTINGS };

export function initSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (error) {
    console.warn('Failed to load tree settings:', error);
    settings = { ...DEFAULT_SETTINGS };
  }
  persist();
}

export function getSettings() {
  return settings;
}

export function updateSettings(patch) {
  if (!patch || typeof patch !== 'object') {
    return;
  }
  settings = { ...settings, ...patch };
  persist();
  dispatchChange();
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to persist tree settings:', error);
  }
}

function dispatchChange() {
  const event = new CustomEvent('tree-settings-changed', {
    detail: { settings: { ...settings } }
  });
  window.dispatchEvent(event);
}
