// "Show once per video" persistence for the post-generation satisfaction survey.
// Mirrors src/lib/tourState.js: a namespaced key + try/catch so a locked-down
// browser (storage disabled) never throws. Keyed by sessionId so each finished
// video gets exactly one survey. The `:v1` suffix lets us re-show the survey
// after a future redesign by bumping the version.
const PREFIX = "merge:survey:";
const VERSION = "v1";

function keyFor(sessionId) {
  return `${PREFIX}${sessionId}:${VERSION}`;
}

// True once the user has answered OR dismissed the survey for this video, so the
// card never returns. Missing sessionId is treated as "done" (nothing to key on).
export function surveyDone(sessionId) {
  if (!sessionId) return true;
  try {
    return localStorage.getItem(keyFor(sessionId)) === "1";
  } catch {
    return false; // storage unavailable, treat as not-done (survey may re-show, harmless)
  }
}

// Called on both submit and dismiss - both count as answered.
export function markSurveyDone(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.setItem(keyFor(sessionId), "1");
  } catch {
    /* storage unavailable, ignore */
  }
}
