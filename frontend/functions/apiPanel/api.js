import {
  totalApisSpan,
  uniqueApisSpan,
  apiListDiv,
  stepsContainer,
  apiTotalSummary,
  apiUniqueSummary
} from '../core/dom.js';

export function updateApiStats() {
  const allApis = [];
  const api2List = [];
  const api1List = [];
  
  // Collect all APIs from steps and substeps
  stepsContainer.querySelectorAll('.step-item').forEach(step => {
    // Legacy format: APIs directly under step
    const legacyApiInput = step.querySelector('.step-api-legacy');
    if (legacyApiInput && legacyApiInput.value.trim()) {
      const apis = legacyApiInput.value.split(',')
        .map(api => api.trim())
        .filter(Boolean);
      allApis.push(...apis);
    }
    
    // New format: APIs in substeps with scoring
    step.querySelectorAll('.substep-item').forEach(substepItem => {
      const substepApi2 = substepItem.querySelector('.substep-api-2');
      const substepApi1 = substepItem.querySelector('.substep-api-1');
      
      if (substepApi2 && substepApi2.value.trim()) {
        const apis = substepApi2.value.split(',')
          .map(api => api.trim())
          .filter(Boolean);
        api2List.push(...apis);
        allApis.push(...apis);
      }
      
      if (substepApi1 && substepApi1.value.trim()) {
        const apis = substepApi1.value.split(',')
          .map(api => api.trim())
          .filter(Boolean);
        api1List.push(...apis);
        allApis.push(...apis);
      }
    });
  });
  
  // Calculate statistics
  const totalCount = allApis.length;
  const uniqueApis = [...new Set(allApis)].sort();
  const uniqueCount = uniqueApis.length;
  const unique2Count = [...new Set(api2List)].length;
  const unique1Count = [...new Set(api1List)].length;
  
  // Update display
  totalApisSpan.textContent = totalCount;
  uniqueApisSpan.textContent = `${uniqueCount} (2分: ${unique2Count}, 1分: ${unique1Count})`;
  if (apiTotalSummary) {
    apiTotalSummary.textContent = totalCount;
  }
  if (apiUniqueSummary) {
    apiUniqueSummary.textContent = `${uniqueCount} (2分: ${unique2Count}, 1分: ${unique1Count})`;
  }
  
  // Display unique API list
  renderApiListDisplay(uniqueApis, allApis);
}

function renderApiListDisplay(uniqueApis, allApis) {
  if (!apiListDiv) {
    return;
  }

  if (!uniqueApis || uniqueApis.length === 0) {
    apiListDiv.innerHTML = '<div style="font-size: 12px; color: #9ca3af; margin-top: 8px;">暂无API</div>';
    return;
  }

  const apiCounts = {};
  allApis.forEach(api => {
    apiCounts[api] = (apiCounts[api] || 0) + 1;
  });

  const listHtml = uniqueApis.map(api => {
    const count = apiCounts[api];
    const countStr = count > 1 ? ` <span style="color: #3b82f6;">(×${count})</span>` : '';
    return `<code style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 3px; margin: 2px; display: inline-block; font-size: 11px;">${api}${countStr}</code>`;
  }).join(' ');

  apiListDiv.innerHTML = `
    <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">唯一API列表:</div>
    <div style="margin-top: 4px;">${listHtml}</div>
  `;
}
