import {
  getState,
  initState,
  selectNode,
  expandAll,
  collapseAll,
  createNode,
  addChild,
  getNodeById
} from './core/state.js';
import { initSettings } from './core/settings.js';
import {
  treeSearchInput,
  expandAllBtn,
  collapseAllBtn,
  addRootChildBtn,
  treeNav,
  openTreePreviewBtn,
  toggleSidebarBtn
} from './ui/dom.js';
import { renderTreeNav, setSearchTerm, findFirstMatch } from './ui/treeNav.js';
import { renderEditor } from './ui/editor.js';
import { renderPreview } from './ui/preview.js';
import { renderBreadcrumb } from './ui/breadcrumb.js';
import { initIoHandlers, openPasteModal } from './io/index.js';
import { openTreePreviewWindow, syncTreePreviewWindow } from './utils/treePreviewWindow.js';
import { initSettingsPanel } from './ui/settings.js';
import { loadCsvTargetDir } from '../shared/csvTargetDir.js';

const treeApp = document.getElementById('treeApp');

initSettings();
initState();
renderTreeNav();
renderEditor();
renderPreview();
renderBreadcrumb();
syncTreePreviewWindow();

loadCsvTargetDir();

initIoHandlers();
initSettingsPanel();

if (toggleSidebarBtn && treeApp) {
  const applySidebarToggleState = () => {
    const collapsed = treeApp.classList.contains('sidebar-collapsed');
    toggleSidebarBtn.textContent = collapsed ? '⟩' : '⟨';
    toggleSidebarBtn.setAttribute('aria-expanded', String(!collapsed));
    toggleSidebarBtn.setAttribute('aria-label', collapsed ? '展开目录' : '折叠目录');
    toggleSidebarBtn.title = collapsed ? '展开目录' : '折叠目录';
  };

  toggleSidebarBtn.addEventListener('click', () => {
    treeApp.classList.toggle('sidebar-collapsed');
    applySidebarToggleState();
  });

  applySidebarToggleState();
}

treeNav.addEventListener('tree-node-selected', () => {
  renderEditor();
  renderPreview();
  renderBreadcrumb();
  syncTreePreviewWindow();
});

treeSearchInput.addEventListener('input', event => {
  setSearchTerm(event.target.value);
  const match = findFirstMatch(event.target.value.trim());
  if (match) {
    selectNode(match.id);
    renderTreeNav();
    renderEditor();
    renderPreview();
    renderBreadcrumb();
    syncTreePreviewWindow();
  }
});

expandAllBtn.addEventListener('click', () => {
  expandAll();
  renderTreeNav();
  syncTreePreviewWindow();
});

collapseAllBtn.addEventListener('click', () => {
  collapseAll();
  renderTreeNav();
  syncTreePreviewWindow();
});

addRootChildBtn.addEventListener('click', () => {
  const { root } = getState();
  const child = createNode({ name: '新子节点' });
  addChild(root.id, child);
  selectNode(child.id);
  renderTreeNav();
  renderEditor();
  renderPreview();
  renderBreadcrumb();
  syncTreePreviewWindow();
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'v' && event.shiftKey) {
    event.preventDefault();
    openPasteModal();
  }
});

if (openTreePreviewBtn) {
  openTreePreviewBtn.addEventListener('click', () => {
    openTreePreviewWindow();
  });
}

window.__treePreviewSelect = nodeId => {
  if (!selectNode(nodeId)) {
    return;
  }
  renderTreeNav();
  renderEditor();
  renderPreview();
  renderBreadcrumb();
  syncTreePreviewWindow();
};

window.__treePreviewAddChild = parentId => {
  const found = getNodeById(parentId);
  if (!found) {
    return;
  }
  const parentNode = found.node;
  const nextIndex = (parentNode.children?.length || 0) + 1;
  const child = createNode({ name: `步骤 ${nextIndex}` });
  addChild(parentNode.id, child);
  selectNode(child.id);
  renderTreeNav();
  renderEditor();
  renderPreview();
  renderBreadcrumb();
  syncTreePreviewWindow();
};
