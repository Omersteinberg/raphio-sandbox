import { toast } from "react-toastify";
import * as sessionService from "@/services/session";
import { reportClientError } from "@/services/errorReporter";

// WizardSession job types that produce the script. The session's single job
// slot is shared by many job kinds (export, reassemble, clip regen...), so
// resume must only react to the script-producing ones.
export const SCRIPT_JOB_TYPES = new Set([
  "GENERATE_OUTLINE",
  "GENERATE_SCRIPT",
  "GENERATE_INTRO_SCRIPT",
]);

/**
 * Classify the freshly loaded session's job slot for resume purposes.
 *
 * Script generation runs detached in the backend, so leaving the page never
 * stops it - but it also means the session a user resumes into can hold a
 * script job in any state:
 *  - "running": still generating; the UI should show progress and re-attach
 *  - "failed":  it failed while the user was away and no script exists, so
 *               the user must be told (the failure toast at kickoff time was
 *               never seen) and offered a retry
 *  - null:      nothing to do (no job, job done, or an unrelated job type)
 */
export function detectScriptJobOnResume(sessionData) {
  if (!sessionData || !SCRIPT_JOB_TYPES.has(sessionData.jobType)) return null;
  if (sessionData.jobStatus === "RUNNING") return "running";
  if (sessionData.jobStatus === "FAILED" && !sessionData.scriptData) return "failed";
  return null;
}

/**
 * Derive how far the script PHASE already progressed for a freshly resumed
 * session, from its durable backend state (not the live job slot). The merged
 * checklist's script rows are threshold bands over this 0-100 value (see
 * PROMPT_ONLY_SUB_STEPS / IMAGE_SCRIPT_SUB_STEPS), so each value below is
 * picked to complete exactly the rows whose work is provably done:
 *  - script written                   -> 100 (all script rows done)
 *  - images analyzed (restyle kicked) -> 70  (upload + analyze + restyle done)
 *  - images uploaded                  -> 40  (session + upload done)
 *  - session exists                   -> 20  (session row done)
 */
export function scriptProgressForResumedSession(sessionData) {
  if (!sessionData) return 0;
  if (sessionData.scriptData) return 100;
  if (sessionData.imageAnalysis) return 70;
  if (sessionData.images?.length > 0) return 40;
  return 20;
}

/**
 * Re-attach to a script job that is still RUNNING in the backend after the
 * user navigated away and resumed the session. Read-only on the backend: it
 * polls the session's existing job slot - it never starts a job, never
 * creates a session, and never charges.
 *
 * The caller keeps its `loading` flag up while awaiting this, which keeps the
 * pipeline's ScriptLoadingScreen on screen; progress is driven into
 * `progressBand` from the backend's jobProgress, with the same decelerating
 * creep as the kickoff path so the bar never looks frozen between milestones.
 *
 * Resolves true when the script arrived (session + scriptData updated),
 * false when the job failed (user notified, Slack alerted via telemetry).
 */
export async function attachToRunningScriptJob({
  sessionId,
  jobType,
  setSession,
  setScriptData,
  setScriptProgress,
  progressBand = [75, 98],
}) {
  const [lo, hi] = progressBand;
  let creep = lo;
  const applyCreep = (value) => {
    creep = Math.max(creep, value);
    const v = Math.round(creep);
    setScriptProgress((prev) => Math.max(prev, v));
  };
  applyCreep(lo);
  const creepTimer = setInterval(() => applyCreep(creep + (hi - creep) * 0.02), 500);

  try {
    await sessionService.pollJobUntilDone(sessionId, {
      expectedJobType: jobType,
      onProgress: (status) => {
        const pct = status?.jobProgress?.percentage;
        if (typeof pct === "number") {
          applyCreep(lo + (pct / 100) * (hi - lo));
        }
      },
    });
    // Refetch rather than trusting the job result's shape: the session is the
    // source of truth and the stage-sync effects drive the step from it.
    const refreshed = await sessionService.getSession(sessionId);
    setSession(refreshed);
    if (refreshed?.scriptData) setScriptData(refreshed.scriptData);
    setScriptProgress(100);
    toast.success("Your script is ready!");
    return true;
  } catch (err) {
    toast.error("Script generation failed. Please try again.");
    reportClientError({
      kind: "script-job-failed-resume",
      message: `Script job ${jobType} failed after user resumed session ${sessionId}: ${err.message}`,
    });
    return false;
  } finally {
    clearInterval(creepTimer);
  }
}

/**
 * The user resumed a session whose script job FAILED while they were away.
 * Tell them, and tell the team (Slack via the client-error telemetry) that a
 * user has actually landed on the retry screen - the backend already alerted
 * at failure time, this adds the "a user saw it" signal.
 */
export function notifyScriptJobFailedOnResume(sessionData) {
  toast.error("Your script didn't finish generating. Please retry.");
  reportClientError({
    kind: "script-job-failed-resume",
    message: `User resumed session ${sessionData.id} after ${sessionData.jobType} failed: ${sessionData.jobError || "unknown error"}`,
  });
}
