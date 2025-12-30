import { computeContextSymbols, parseList } from '../core/state.js';

export function buildTreeCsv(root) {
  // Use three columns as requested: informal statement, score 2 api, score 1 api
  const rows = [[
    'informal statement',
    'score 2 api',
    'score 1 api'
  ]];

  const walk = (node, path) => {
    const currentPath = [...path, node.name?.trim() || node.id];
    const ctx = computeContextSymbols(node.id);
    const parts = [];
    if (ctx.length > 0) {
      parts.push(`符号设定: ${ctx.join(', ')}`);
    }
    if (node.problem) {
      parts.push(`子问题: ${node.problem}`);
    }
    if (node.description) {
      parts.push(`步骤: ${node.description}`);
    }
    if (parts.length > 0) {
      const informal = parts.join(' | ');
      const api2List = parseList(node.api2);
      const api1List = parseList(node.api1);
      const api2 = api2List.length ? api2List.map(a => `\`${a}\``).join('\n') : '';
      const api1 = api1List.length ? api1List.map(a => `\`${a}\``).join('\n') : '';
      rows.push([
        csvField(informal),
        csvField(api2),
        csvField(api1)
      ]);
    }
    (node.children || []).forEach(child => walk(child, currentPath));
  };

  walk(root, []);
  return rows.map(row => row.join(',')).join('\n');
}

function csvField(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
