const SUPPORTED_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'HR', 'LI', 'PRE', 'TABLE', 'BLOCKQUOTE']);

let currentSegments = [];

export function applyPreviewSegments(previewEl, segments = []) {
  if (!previewEl) {
    currentSegments = [];
    return;
  }

  currentSegments = Array.isArray(segments) ? segments : [];

  clearExistingAnnotations(previewEl);

  const nodes = collectRelevantNodes(previewEl);
  let searchStart = 0;

  currentSegments.forEach((segment, index) => {
    const match = findNextMatchingNode(nodes, segment.tag, searchStart);
    if (!match) {
      return;
    }
    const { node, nextIndex } = match;
    annotateNode(node, index, segment);
    searchStart = nextIndex;
  });
}

export function getSegmentByIndex(index) {
  if (typeof index !== 'number' || Number.isNaN(index)) {
    return null;
  }
  return currentSegments[index] || null;
}

function clearExistingAnnotations(root) {
  root.querySelectorAll('[data-preview-segment-index]').forEach(node => {
    delete node.dataset.previewSegmentIndex;
    delete node.dataset.previewSourceKind;
    delete node.dataset.previewSourceStep;
    delete node.dataset.previewSourceSubstep;
  });
}

function collectRelevantNodes(root) {
  const nodes = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        return SUPPORTED_TAGS.has(node.tagName)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      }
    }
  );

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  return nodes;
}

function findNextMatchingNode(nodes, expectedTag, startIndex) {
  if (!expectedTag) {
    return null;
  }

  const tag = expectedTag.toUpperCase();

  for (let idx = startIndex; idx < nodes.length; idx += 1) {
    if (nodes[idx].tagName === tag) {
      return { node: nodes[idx], nextIndex: idx + 1 };
    }
  }
  return null;
}

function annotateNode(node, segmentIndex, segment) {
  node.dataset.previewSegmentIndex = String(segmentIndex);
  const source = segment.source || {};
  if (source.kind) {
    node.dataset.previewSourceKind = source.kind;
  }
  if (typeof source.stepIndex === 'number') {
    node.dataset.previewSourceStep = String(source.stepIndex);
  }
  if (typeof source.substepIndex === 'number') {
    node.dataset.previewSourceSubstep = String(source.substepIndex);
  }
}
