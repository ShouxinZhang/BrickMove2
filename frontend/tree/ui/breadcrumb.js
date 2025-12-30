import { breadcrumb } from './dom.js';
import { getState, findNodePath } from '../core/state.js';

export function renderBreadcrumb() {
  const { selectedId } = getState();
  if (!selectedId) {
    breadcrumb.textContent = '';
    return;
  }
  const path = findNodePath(selectedId);
  if (!path.length) {
    breadcrumb.textContent = '';
    return;
  }
  breadcrumb.innerHTML = path
    .map(node => node.name?.trim() || node.id)
    .join(' › ');
}
