import { exportCsvBtn } from '../core/dom.js';
import { collectData } from '../steps/index.js';

export function initCsvExport() {
  exportCsvBtn.addEventListener('click', exportToCsv);
}

function exportToCsv() {
  const data = collectData();
  
  // CSV header
  const csvRows = [
    ['informal_statement', 'score_2_api', 'score_1_api']
  ];
  
  // Process each step
  data.steps.forEach((step, stepIdx) => {
    // If step has substeps, export each substep
    if (step.substeps && step.substeps.length > 0) {
      step.substeps.forEach(substep => {
        if (substep.description) {
          const api2 = substep.api2 || '';
          const api1 = substep.api1 || '';
          csvRows.push([
            escapeCsvField(substep.description),
            escapeCsvField(api2),
            escapeCsvField(api1)
          ]);
        }
      });
    } else if (step.step) {
      // Old format: step without substeps
      const api = step.api || '';
      csvRows.push([
        escapeCsvField(step.step),
        escapeCsvField(api),
        ''
      ]);
    }
  });
  
  // Convert to CSV string
  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.title || 'proof'}_api_export.csv`;
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
