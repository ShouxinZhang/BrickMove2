export const state = {
  currentFileName: 'theorem.md',
  stepCount: 0,
  substepSeed: 0,
  extractedApis: new Set()
};

export function resetSteps() {
  state.stepCount = 0;
  state.substepSeed = 0;
}

export function setExtractedApis(apis) {
  state.extractedApis = new Set(apis);
}

export function clearExtractedApis() {
  state.extractedApis = new Set();
}

export function nextSubstepId() {
  state.substepSeed += 1;
  const uniqueSuffix = state.substepSeed.toString(36);
  return `substep-${Date.now().toString(36)}-${uniqueSuffix}`;
}
