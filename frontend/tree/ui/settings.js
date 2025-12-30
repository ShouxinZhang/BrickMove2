import {
  treeSettingsBtn,
  settingsModal,
  settingsForm,
  settingsConfirmDeleteToggle,
  settingsCsvDirInput,
  settingsCancelBtn
} from './dom.js';
import { getSettings, updateSettings } from '../core/settings.js';
import { getCsvTargetDir, setCsvTargetDir, loadCsvTargetDir } from '../../shared/csvTargetDir.js';

export function initSettingsPanel() {
  if (!treeSettingsBtn || !settingsModal) {
    return;
  }

  treeSettingsBtn.addEventListener('click', () => {
    syncControls();
    settingsModal.showModal();
  });

  settingsModal.addEventListener('close', () => {
    syncControls();
  });

  loadCsvTargetDir();

  if (settingsForm) {
    settingsForm.addEventListener('submit', event => {
      event.preventDefault();
      const value = settingsCsvDirInput?.value ?? '';
      setCsvTargetDir(value);
      settingsModal.close();
    });
  }

  if (settingsCancelBtn) {
    settingsCancelBtn.addEventListener('click', () => {
      settingsModal.close();
      syncControls();
    });
  }

  if (settingsConfirmDeleteToggle) {
    settingsConfirmDeleteToggle.addEventListener('change', event => {
      updateSettings({ confirmDelete: Boolean(event.target.checked) });
    });
  }

  window.addEventListener('tree-settings-changed', () => {
    syncControls();
  });
}

function syncControls() {
  const settings = getSettings();
  if (settingsConfirmDeleteToggle) {
    settingsConfirmDeleteToggle.checked = Boolean(settings.confirmDelete);
  }
  if (settingsCsvDirInput) {
    settingsCsvDirInput.value = getCsvTargetDir();
  }
}
