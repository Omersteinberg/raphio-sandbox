// Builders for the shared ProgressChecklist task lists. Used to compose a single
// continuous checklist across phases (script generation -> video generation) when
// a run is fully automatic, so the user sees one list instead of two screens.
import { Film, Mic, Layers, Music } from "lucide-react";

export function statusForRange(range, progress) {
  if (progress >= range[1]) return "completed";
  if (progress >= range[0]) return "processing";
  return "pending";
}

// The backend overwrites progressData with {stage:'FAILED', percentage:0, error}
// when a run dies, destroying the clip/TTS counters and musicState. The only
// signals that survive a failure are video.status, progressData.error and the
// per-section statuses, so attribution reads those and nothing else. The row
// statuses computed below are rendering artifacts (they default to "processing")
// and would misattribute if used here.
const GENERIC_FAILURE_PATTERNS = [/generation stopped unexpectedly/i, /taking longer than expected/i];

function isGenericFailure(reason) {
  return GENERIC_FAILURE_PATTERNS.some((pattern) => pattern.test(reason || ""));
}

/**
 * Which checklist row failed, and why. Returns null when nothing has failed.
 *
 * `fatal: false` means the run continues (music is best-effort and never fails
 * the video).
 *
 * `rowId: null` means the failure is real but cannot be attributed to a row.
 * That happens when the run died before any section finished, or under the
 * generic stuck-worker message, where an assembly crash is indistinguishable
 * from a TTS hang (TTS runs in Promise.all alongside the clips, so a hang there
 * also stops assembly from ever starting). Guessing a row would be a lie.
 *
 * Note the TTS row is never returned: the backend swallows TTS failures without
 * persisting them, so there is no signal to read.
 */
/**
 * Did this session's render fail? The single source of truth for the hooks.
 *
 * Deliberately does NOT also require `stage !== "GENERATING"`. The backend clears a
 * previous attempt's FAILED marker inside claimGenerationLock, in the same step as
 * the flip to GENERATING, so the two can no longer coexist and a stale error cannot
 * be misread as belonging to the run that just started. Requiring the stage to have
 * rolled back meant a failure the backend recorded but had not yet rolled back was
 * invisible, and the checklist span forever.
 */
export function isGenerationFailed(session) {
  const video = session?.video;
  if (!video) return false;
  return video.status === "FAILED" || video.progressData?.stage === "FAILED";
}

/**
 * Locally clear a previous attempt's failure marker when a retry starts.
 *
 * The backend does the same thing inside claimGenerationLock, but its result only
 * reaches us on the next 5s poll. Until then `session.video.status` still reads
 * FAILED, so the failure card and a reddened checklist row would linger over a run
 * that is already under way. Use with setSession.
 */
export function clearVideoFailure(session) {
  if (!session?.video || session.video.status !== "FAILED") return session;
  return { ...session, video: { ...session.video, status: "PROCESSING", progressData: null } };
}

export function deriveFailedStep(session) {
  const video = session?.video;
  if (!video) return null;

  const progressData = video.progressData || {};
  const sections = video.sections || [];
  const isFailed = video.status === "FAILED" || progressData.stage === "FAILED";

  if (!isFailed) {
    if (progressData.musicState === "failed") {
      return {
        rowId: "music",
        fatal: false,
        reason: "Background music could not be generated. Your video will finish without it.",
      };
    }
    return null;
  }

  const reason = progressData.error || "Video generation failed. Please try again.";

  if (sections.some((s) => s.status === "FAILED")) {
    return { rowId: "clips", fatal: true, reason };
  }
  if (sections.length > 0 && sections.every((s) => s.status === "COMPLETED") && !isGenericFailure(reason)) {
    return { rowId: "assembly", fatal: true, reason };
  }
  return { rowId: null, fatal: true, reason };
}

// Fatal failure at row i: i is red, everything before it succeeded, everything
// after it never ran. Without the forward clamp the wiped TTS counters make
// totalTTS fall back to 0, so the narration row renders green on a failed video.
function applyFailure(tasks, failure) {
  if (!failure) return tasks;

  if (!failure.fatal) {
    return tasks.map((t) => (t.id === failure.rowId ? { ...t, status: "warning", reason: failure.reason } : t));
  }

  const index = tasks.findIndex((t) => t.id === failure.rowId);
  if (index === -1) return tasks;

  return tasks.map((t, i) => {
    if (i === index) return { ...t, status: "failed", reason: failure.reason };
    if (i > index) return { ...t, status: "pending" };
    return { ...t, status: "completed" };
  });
}

// Script-generation phase rows from the sub-step ranges + the 0-100 script progress.
export function buildScriptTasks(subSteps, progress) {
  return subSteps.map((s) => ({
    id: `script-${s.id}`,
    name: s.label,
    status: statusForRange(s.range, progress),
  }));
}

// Video-generation phase rows from the backend progressData. `started` gates the
// rows to "pending" until generation actually begins (so they don't show as
// running while an earlier phase is still going). `musicRequested` is the user's
// in-wizard music toggle: before the video row exists (early phases) the backend
// `backgroundMusicEnabled` flag isn't available yet, so we fall back to the
// requested toggle. That keeps the music card visible from the start in every
// mode instead of only appearing once generation is underway. Once the backend
// says music was "skipped" (e.g. no music prompt), the card correctly disappears.
export function buildVideoTasks(session, scriptData, { started = true, musicRequested } = {}) {
  const sections = session?.video?.sections || [];
  const completedSections = sections.filter((s) => s.status === "COMPLETED").length;
  const totalSections = sections.length;
  const progressData = session?.video?.progressData || {};
  const currentStage = progressData.stage || "GENERATING";
  const totalClips = progressData.totalClips || totalSections;
  const completedClips = progressData.completedClips ?? progressData.currentClip ?? completedSections;
  const completedTTS = progressData.completedTTS || 0;
  const totalTTS = progressData.totalTTS || 0;
  const musicState = progressData.musicState || null;
  const musicEnabled = musicState
    ? musicState !== "skipped"
    : !!(session?.video?.backgroundMusicEnabled ?? musicRequested);
  const isDone = !!session?.video?.finalVideoUrl;
  const isAssembly = currentStage === "ASSEMBLY";
  const after = isDone || isAssembly;
  const allClipsDone = totalClips > 0 && completedClips >= totalClips;
  const allTtsDone = totalTTS === 0 || completedTTS >= totalTTS;

  const clipsStatus = after || allClipsDone ? "completed" : "processing";
  const ttsStatus = after || allTtsDone ? "completed" : "processing";
  // A failed music job is NOT a completed one. applyFailure below turns this row
  // amber; treating it as "done" here painted a failure green.
  const musicStatus = after || musicState === "done" ? "completed" : "processing";
  const assemblyStatus = isDone ? "completed" : isAssembly ? "processing" : "pending";

  // NOTE: image restyle is a pre-generation step (it runs before the script, see
  // IMAGE_SCRIPT_SUB_STEPS "restyle"), so it is NOT a render-phase row. It used to
  // be duplicated here as a hardcoded "completed" card, which showed twice in the
  // image checklist (once from the script sub-steps, once from here). It lives only
  // in the script/setup phase now.
  let tasks = [
    { id: "clips", name: "Creating Video Clips", description: `${completedClips}/${totalClips} clips complete`, icon: Film, status: clipsStatus },
    {
      id: "tts",
      name: "Generating Narration",
      description: totalTTS > 0 ? `${completedTTS}/${totalTTS} sections narrated` : "Converting script to speech with AI voice",
      icon: Mic,
      status: ttsStatus,
    },
    ...(musicEnabled
      ? [{ id: "music", name: "Generating Music", description: "Composing background music for your video", icon: Music, status: musicStatus }]
      : []),
    { id: "assembly", name: "Assembling Final Video", description: "Combining clips and audio", icon: Layers, status: assemblyStatus },
  ];

  if (!started) {
    tasks = tasks.map((t) => ({ ...t, status: "pending" }));
  }

  const failure = deriveFailedStep(session);
  tasks = applyFailure(tasks, failure);

  const realProgress = progressData.percentage ?? Math.round(
    ((completedSections / Math.max(totalSections, 1)) * 70) +
    (session?.video?.narrationUrl ? 15 : 0) +
    (session?.video?.finalVideoUrl ? 15 : 0)
  );

  return { tasks, realProgress, failure };
}
