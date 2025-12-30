import { traverse, computeContextSymbols, parseList, findNodePath } from '../core/state.js';

export function buildNodeMarkdown(node, contextSymbols) {
  const lines = [];
  const symbols = contextSymbols || [];
  lines.push(`符号设定: ${symbols.join(', ') || '无'}`);
  lines.push('');
  lines.push(`问题: ${node.problem?.trim() || ''}`);
  lines.push('');

  const selfDescription = node.description?.trim();
  const selfApi2 = parseList(node.api2);
  const selfApi1 = parseList(node.api1);
  const selfProof = (node.mathProof || '').trim();

  if (selfDescription) {
    lines.push(`说明: ${selfDescription}`);
  }
  if (selfProof) {
    lines.push(`math proof: ${selfProof}`);
  }
  if (selfApi2.length > 0) {
    lines.push('2 score api:');
    selfApi2.forEach(api => {
      lines.push(`- \`${api}\``);
    });
    lines.push('');
  }
  if (selfApi1.length > 0) {
    lines.push('1 score api:');
    selfApi1.forEach(api => {
      lines.push(`- \`${api}\``);
    });
    lines.push('');
  }
  if (selfDescription || selfProof || selfApi1.length || selfApi2.length) {
    lines.push('');
  }

  // Do not inline children here; buildSubtreeMarkdown will expand children.

  return lines.join('\n');
}

export function buildTreeMarkdown(root) {
  const lines = [];
  traverse(root, node => {
    const depth = findNodePath(node.id).length - 1;
    const indent = '#'.repeat(Math.max(1, depth + 2));
    const title = node.name?.trim() || `节点 ${node.id}`;
    lines.push(`${indent} ${title}`);
    lines.push('');
    lines.push(buildNodeMarkdown(node, computeContextSymbols(node.id)));
    lines.push('---');
    lines.push('');
  });
  return lines.join('\n').trim();
}

export function buildSubtreeMarkdown(node) {
  if (!node) {
    return '';
  }

  const lines = [];

  const walk = (current, depth) => {
    const headingLevel = Math.min(6, 3 + depth);
    const heading = '#'.repeat(headingLevel);
    const title = current.name?.trim() || current.problem?.trim() || current.id;
    lines.push(`${heading} ${title}`);
    lines.push('');
    const content = buildNodeMarkdown(current, computeContextSymbols(current.id)).trim();
    if (content) {
      lines.push(content);
      lines.push('');
    }
    (current.children || []).forEach(child => walk(child, depth + 1));
  };

  walk(node, 0);
  return lines.join('\n').trim();
}
