export const state = {
  currentFileName: 'theorem.md',
  stepCount: 0,
  substepSeed: 0
};

export function resetSteps() {
  state.stepCount = 0;
  state.substepSeed = 0;
}

export function nextSubstepId() {
  state.substepSeed += 1;
  const uniqueSuffix = state.substepSeed.toString(36);
  return `substep-${Date.now().toString(36)}-${uniqueSuffix}`;
}
