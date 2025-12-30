import {
  settingsBtn,
  settingsDialog,
  settingsForm,
  settingsCsvDirInput,
  settingsCancelBtn
} from '../core/dom.js';
import { getCsvTargetDir, setCsvTargetDir, loadCsvTargetDir } from '../../shared/csvTargetDir.js';

function syncInput() {
  if (settingsCsvDirInput) {
    settingsCsvDirInput.value = getCsvTargetDir();
  }
}

export function initCsvSettings() {
  loadCsvTargetDir();

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      syncInput();
      settingsDialog?.showModal();
    });
  }

  if (settingsCancelBtn) {
    settingsCancelBtn.addEventListener('click', () => {
      syncInput();
      settingsDialog?.close();
    });
  }

  if (settingsForm) {
    settingsForm.addEventListener('submit', event => {
      event.preventDefault();
      const value = settingsCsvDirInput?.value ?? '';
      setCsvTargetDir(value);
      settingsDialog?.close();
    });
  }

  if (settingsDialog) {
    settingsDialog.addEventListener('close', () => {
      syncInput();
    });
  }

  syncInput();
}
