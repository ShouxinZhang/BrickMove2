import {
  fileInput,
  loadJsonBtn,
  theoremTitle,
  theoremStatement,
  stepsContainer,
  exportMdBtn,
  preview,
  appRoot,
  tocToggle,
  tocPanel,
  tocStepsList,
  apiListToggle,
  apiTotalSummary,
  apiUniqueSummary
} from './functions/dom.js';
import { initSteps, addStep } from './functions/steps/index.js';
import { renderPreview } from './functions/render.js';
import { initJsonLoader, showJsonInputModal } from './functions/jsonLoader.js';
import { enableDragAndDrop } from './functions/dragDrop.js';
import { initSaveHandler } from './functions/save.js';
import { initCsvExport } from './functions/csv.js';
import { initMarkdownExport } from './functions/markdownExport.js';
import { initPreviewInteractions } from './functions/previewSync/index.js';
import { initToc, refreshToc } from './functions/toc/index.js';
import { updateApiStats } from './functions/api.js';
import { initApiModal, refreshApiModalContent } from './functions/modal.js';

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false
});

const syncOutputs = () => {
  renderPreview();
  updateApiStats();
  refreshToc();
  refreshApiModalContent();
};

initPreviewInteractions(preview);
initSteps(syncOutputs);
initJsonLoader();
initSaveHandler();
initCsvExport();
initMarkdownExport(exportMdBtn);
initToc({
  toggle: tocToggle,
  panel: tocPanel,
  stepsList: tocStepsList,
  appRoot,
  stepsContainer,
  onStructureChange: syncOutputs
});
initApiModal();

if (!stepsContainer.querySelector('.step-item')) {
  addStep();
}

// Add error handling for loadJsonBtn
if (loadJsonBtn) {
  loadJsonBtn.addEventListener('click', () => {
    console.log('Load JSON button clicked');
    showJsonInputModal();
  });
} else {
  console.error('loadJsonBtn not found in DOM');
}

theoremTitle.addEventListener('input', syncOutputs);
theoremStatement.addEventListener('input', syncOutputs);
stepsContainer.addEventListener('input', syncOutputs);

[fileInput].forEach(enableDragAndDrop);

syncOutputs();
