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

          const api2List = formatApiList(substep.api2);
          if (api2List) {
            markdownParts.push(`  - API (2分): ${api2List}`);
            segments.push({
              tag: 'LI',
              source: { kind: 'substepApi2', stepIndex: idx, substepIndex: subIdx }
            });
          }

          const api1List = formatApiList(substep.api1);
          if (api1List) {
            markdownParts.push(`  - API (1分): ${api1List}`);
            segments.push({
              tag: 'LI',
              source: { kind: 'substepApi1', stepIndex: idx, substepIndex: subIdx }
            });
          }

          addedAnySubstep = true;
        });

        if (addedAnySubstep) {
          markdownParts.push('');
        }
      } else if (step.api) {
        const legacyApiList = formatApiList(step.api);
        if (legacyApiList) {
          markdownParts.push(`API: ${legacyApiList}`);
          segments.push({
            tag: 'P',
            source: { kind: 'stepApi', stepIndex: idx }
          });
          markdownParts.push('');
        }
      }
    });
  }

  const markdown = markdownParts.join('\n');
  return { markdown, segments };
}

function formatApiList(raw) {
  if (!raw) {
    return '';
  }

  const entries = Array.isArray(raw) ? raw : String(raw).split(',');
  const cleaned = entries
    .map(entry => entry.trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return '';
  }

  return cleaned.map(item => `\`${item}\``).join(', ');
}
