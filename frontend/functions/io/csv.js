import { exportCsvBtn } from '../core/dom.js';
import { collectData } from '../steps/index.js';

export function initCsvExport() {
  exportCsvBtn.addEventListener('click', exportToCsv);
}

export function getEditorCsv() {
  const data = collectData();

  // CSV header
  const csvRows = [
    ['informal statement', 'score 2 api', 'score 1 api']
  ];

  // Process each step
  data.steps.forEach((step, stepIdx) => {
    // If step has substeps, export each substep
    if (step.substeps && step.substeps.length > 0) {
      step.substeps.forEach(substep => {
        const informalStatement = buildInformalStatement(step, substep);
        if (informalStatement) {
          const api2 = formatApiCell(substep.api2);
          const api1 = formatApiCell(substep.api1);
          csvRows.push([
            escapeCsvField(informalStatement),
            escapeCsvField(api2),
            escapeCsvField(api1)
          ]);
        }
      });
    } else if (step.step) {
      // Old format: step without substeps
      const informalStatement = buildLegacyInformalStatement(step, stepIdx);
      if (!informalStatement) {
        return;
      }
      const api = formatApiCell(step.api);
      csvRows.push([
        escapeCsvField(informalStatement),
        escapeCsvField(api),
        ''
      ]);
    }
  });

  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  const filename = `${data.title || 'proof'}_api_export.csv`;
  return { csvContent, filename };
}

function exportToCsv() {
  const { csvContent, filename } = getEditorCsv();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvField(field) {
  if (!field) return '';
  
  // Convert to string
  const str = String(field);
  
  // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

function buildInformalStatement(step, substep) {
  const parts = [];
  const stepTitle = (step.title || '').trim();
  const substepDesc = substep && typeof substep.description === 'string'
    ? substep.description.trim()
    : '';

  if (stepTitle) {
    parts.push(stepTitle);
  }

  if (substepDesc) {
    parts.push(substepDesc);
  } else if (!stepTitle) {
    const fallback = (step.step || '').trim();
    if (fallback) {
      parts.push(fallback);
    }
  }

  return parts.join(' - ');
}

function buildLegacyInformalStatement(step, stepIdx) {
  const stepTitle = (step.title || '').trim();
  const stepDesc = (step.step || '').trim();

  if (stepTitle && stepDesc && stepTitle !== stepDesc) {
    return `${stepTitle} - ${stepDesc}`;
  }
  if (stepDesc) {
    return stepDesc;
  }
  if (stepTitle) {
    return stepTitle;
  }
  return `Step ${stepIdx + 1}`;
}

function formatApiCell(raw) {
  const entries = normalizeApiEntries(raw);
  if (entries.length === 0) {
    return '';
  }
  return entries.map(entry => `\`${entry}\``).join('\n');
}

function normalizeApiEntries(raw) {
  if (!raw) {
    return [];
  }
  const entries = Array.isArray(raw) ? raw : String(raw).split(',');
  return entries
    .map(entry => entry.trim())
    .filter(Boolean);
}
