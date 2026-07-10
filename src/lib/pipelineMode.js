// Pipeline modes a session can be resumed into. "intro" is deliberately absent:
// Creator does not mount IntroPipelineCreator while that pipeline is hidden.
//
// "prompt" (text-to-video) and "image" share ImagePipelineCreator, but they are
// still distinct modes: the mode param drives promptOnly, which hides the photo
// grid and advanced settings. Resuming a prompt session under ?mode=image renders
// the wrong wizard, so the mode must be corrected even though the creator matches.
export const RESUMABLE_MODES = ["prompt", "image", "references"];

/**
 * The `?mode=` a session should be resumed under, or null if the URL already agrees
 * (or the session's mode is not resumable, in which case the caller loads it as-is).
 *
 * Callers navigate to `/create?session=<id>&mode=<result>` when this returns a value.
 * Entry points that omit `&mode=` (WelcomeHero) otherwise fall back to the
 * last-selected mode in localStorage, which loads the session into the wrong wizard.
 */
export function resumeModeFor(sessionPipelineMode, currentModeParam) {
  const mode = sessionPipelineMode || "image";
  if (!RESUMABLE_MODES.includes(mode)) return null;
  return mode === currentModeParam ? null : mode;
}
