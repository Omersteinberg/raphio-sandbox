// Shared predicates for the pre-script phase, where the backend pipeline runner
// and the wizard tab are both driving the same session.
//
// Extracted rather than left inline for the reason stageToStep.js was: they decide
// whether the merged-run overlay keeps spinning or hands the screen back to the
// user, and that decision is worth testing without rendering a whole creator.

// Stages the backend has yet to leave on its own while a script is still owed.
// Sitting on one of these means work IS in flight (or the sweep will pick it up),
// so a null scriptData there is a healthy run, not a deadlock.
export const REF_PRE_SCRIPT_STAGES = new Set([
  "REF_REFERENCES_ADDED",
  "REF_REFERENCES_LOCKED",
]);

export const IMAGE_PRE_SCRIPT_STAGES = new Set(["IMAGES_UPLOADED", "RESTYLING"]);

/**
 * Is this value actually a WizardSession, or some other job's result?
 *
 * A session has ONE job slot shared by every job type, and a poll that resolves on
 * a foreign job hands back that job's result - `{ sceneFrames }` for REF_SCENE_FRAMES,
 * the reference data for REF_LOCK. Assigning one of those to `session` silently
 * destroys the stage the sync effects read, which strands the run with no way back:
 * nothing else in the pre-generation steps refetches the session.
 *
 * `stage` is the field that makes a session a session here - every sync effect is
 * keyed on it, and no other job result carries one.
 */
export function isSessionPayload(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.stage === "string"
  );
}

/**
 * Is the backend still working towards this session's script?
 *
 * A missing script does NOT mean the script phase is idle - a healthy run waits with
 * `scriptData` null while the backend writes it. Work is in flight when the job slot
 * is RUNNING or the stage is one the backend has yet to leave. When neither holds,
 * nothing will ever advance the session on its own and the UI must uncover the
 * manual control instead of spinning forever.
 */
export function isPreScriptWorking(session, workingStages) {
  if (!session) return false;
  if (session.jobStatus === "RUNNING") return true;
  return workingStages.has(session.stage);
}
