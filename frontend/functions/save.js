import { saveBtn } from './dom.js';
import { state } from './state.js';
import { collectData } from './steps/index.js';
import { generateMarkdown } from './render.js';

export function initSaveHandler() {
  saveBtn.addEventListener('click', handleSave);
}

function handleSave() {
  const data = collectData();
  
  // Convert to standard JSON format
  const jsonOutput = {
    theorem_id: data.title,
    statement: data.statement,
    steps: data.steps.map(step => {
      const stepObj = {
        title: step.title || undefined,
        description: step.step || undefined
      };
      
      // Check if has substeps
      if (step.substeps && step.substeps.length > 0) {
        const validSubsteps = step.substeps
          .filter(s => s.description || s.api2 || s.api1)
          .map(s => {
            const substepObj = {
              description: s.description
            };
            
            // Add api2 if present
            if (s.api2) {
              substepObj.api2 = s.api2.split(',').map(a => a.trim()).filter(Boolean);
            }
            
            // Add api1 if present
            if (s.api1) {
              substepObj.api1 = s.api1.split(',').map(a => a.trim()).filter(Boolean);
            }
            
            return substepObj;
          });
        
        if (validSubsteps.length > 0) {
          stepObj.substeps = validSubsteps;
        }
      } else if (step.api) {
        // Old format: APIs directly under step
        stepObj.apis = step.api.split(',').map(a => a.trim()).filter(Boolean);
      }
      
      // Remove undefined fields
      return JSON.parse(JSON.stringify(stepObj));
    })
  };
  
  const jsonStr = JSON.stringify(jsonOutput, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const fileName = state.currentFileName || 'proof.json';
  anchor.download = fileName.replace(/\.md$/, '.json');
  anchor.click();
  URL.revokeObjectURL(url);
}
