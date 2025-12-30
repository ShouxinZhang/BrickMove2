export function buildMarkdownWithSegments(data) {
  const segments = [];
  const markdownParts = [];

  const hasStatement = typeof data.statement === 'string' && data.statement.trim() !== '';

  markdownParts.push(`### 定理 ${data.title || ''}`);
  segments.push({
    tag: 'H3',
    source: { kind: 'theoremTitle' }
  });

  markdownParts.push('');

  markdownParts.push(data.statement || '');
  if (hasStatement) {
    segments.push({
      tag: 'P',
      source: { kind: 'theoremStatement' }
    });
  }

  markdownParts.push('');
  markdownParts.push('---');
  markdownParts.push('');
  markdownParts.push('### 证明');
  markdownParts.push('');

  if (Array.isArray(data.steps)) {
    data.steps.forEach((step, idx) => {
      const hasSubsteps = Array.isArray(step.substeps) && step.substeps.length > 0;
      if (!step.step && !hasSubsteps) {
        return;
      }

      const stepNum = idx + 1;
      let stepHeading = `### Step ${stepNum}`;
      if (step.title) {
        stepHeading += `: ${step.title}`;
      }
      markdownParts.push(stepHeading);
      segments.push({
        tag: 'H3',
        source: { kind: 'stepTitle', stepIndex: idx }
      });
      markdownParts.push('');

      if (step.step) {
        markdownParts.push(step.step);
        segments.push({
          tag: 'P',
          source: { kind: 'stepDescription', stepIndex: idx }
        });
        markdownParts.push('');
      }

      if (hasSubsteps) {
        let addedAnySubstep = false;
        step.substeps.forEach((substep, subIdx) => {
          if (!substep || !substep.description) {
            return;
          }

          markdownParts.push(`- ${substep.description}`);
          segments.push({
            tag: 'LI',
            source: { kind: 'substepDescription', stepIndex: idx, substepIndex: subIdx }
          });

          const api2List = formatApiEntries(substep.api2);
          if (api2List.length > 0) {
            appendApiBlock({
              markdownParts,
              segments,
              entries: api2List,
              label: 'API (2分)',
              indentLevel: 2,
              segment: { tag: 'LI', source: { kind: 'substepApi2', stepIndex: idx, substepIndex: subIdx } }
            });
          }

          const api1List = formatApiEntries(substep.api1);
          if (api1List.length > 0) {
            appendApiBlock({
              markdownParts,
              segments,
              entries: api1List,
              label: 'API (1分)',
              indentLevel: 2,
              segment: { tag: 'LI', source: { kind: 'substepApi1', stepIndex: idx, substepIndex: subIdx } }
            });
          }

          addedAnySubstep = true;
        });

        if (addedAnySubstep) {
          markdownParts.push('');
        }
      } else if (step.api) {
        const legacyApiList = formatApiEntries(step.api);
        if (legacyApiList.length > 0) {
          markdownParts.push('API:');
          segments.push({
            tag: 'P',
            source: { kind: 'stepApi', stepIndex: idx }
          });
          legacyApiList.forEach(api => {
            markdownParts.push(`- \`${api}\``);
          });
          markdownParts.push('');
        }
      }
    });
  }

  const markdown = markdownParts.join('\n');
  return { markdown, segments };
}

function formatApiEntries(raw) {
  if (!raw) {
    return [];
  }

  const entries = Array.isArray(raw) ? raw : String(raw).split(',');
  return entries
    .map(entry => entry.trim())
    .filter(Boolean);
}

function appendApiBlock({ markdownParts, segments, entries, label, indentLevel, segment }) {
  const indent = ' '.repeat(indentLevel);
  markdownParts.push(`${indent}- ${label}:`);
  segments.push(segment);
  entries.forEach(entry => {
    markdownParts.push(`${indent}  - \`${entry}\``);
  });
}
