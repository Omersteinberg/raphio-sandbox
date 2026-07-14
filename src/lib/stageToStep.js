// Which wizard step a backend stage lands on, for the image and prompt pipelines.
//
// Extracted from useSession.js: it is a pure (bool) -> map with no hook dependencies,
// and burying it in an 1800-line hook meant it could only be tested by rendering the
// whole wizard.
//
// When bridges are enabled the flow has an extra "bridges" review step between the
// outline and frames configuration, shifting every later step up by one.
//
// RESTYLING sits between IMAGES_UPLOADED and IMAGES_ANALYZED: the backend parks the
// session there while Kontext restyle jobs are pending. It was once missing from this
// map, and because the caller does `stageMap[stage] ?? 0`, a resuming user was silently
// dropped back on the prompt step with their work apparently gone. Every stage the
// backend can persist must have an entry here — a missing one is not a no-op, it sends
// the user back to step 0.
export function getStageToStep(bridgesEnabled) {
  if (bridgesEnabled) {
    return {
      PROMPT_ENTERED: 1,
      IMAGES_UPLOADED: 1,
      RESTYLING: 1,
      IMAGES_ANALYZED: 1,
      OUTLINE_GENERATED: 1,
      SCRIPT_GENERATED: 2,
      SCRIPT_APPROVED: 3,
      FRAMES_CONFIGURED: 3,
      GENERATING: 4,
      COMPLETED: 5,
      EDITING: 6,
    };
  }
  // No bridges: the bridges review step is skipped entirely.
  return {
    PROMPT_ENTERED: 1,
    IMAGES_UPLOADED: 1,
    RESTYLING: 1,
    IMAGES_ANALYZED: 1,
    OUTLINE_GENERATED: 1,
    SCRIPT_GENERATED: 2, // goes straight to frames config
    SCRIPT_APPROVED: 2,
    FRAMES_CONFIGURED: 2,
    GENERATING: 3,
    COMPLETED: 4,
    EDITING: 5,
  };
}

export default getStageToStep;
