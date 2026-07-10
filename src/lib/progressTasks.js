// Builders for the shared ProgressChecklist task lists. Used to compose a single
// continuous checklist across phases (script generation -> video generation) when
// a run is fully automatic, so the user sees one list instead of two screens.
import { Film, Mic, Layers, Music } from "lucide-react";

export function statusForRange(range, progress) {
  if (progress >= range[1]) return "completed";
  if (progress >= range[0]) return "processing";
  return "pending";
}

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

// Share of the overall progress bar owned by each row. Clip rendering and the
// ffmpeg assembly dominate the wall clock, so the bar reads ~40% by the time the
// clips row starts spinning. Rows that don't exist for a given run (bridges off,
// music off) simply drop out and the rest renormalize.
export const SCRIPT_PHASE_WEIGHT = 0.35;
export const BRIDGE_PHASE_WEIGHT = 0.05;
export const REF_PHASE_WEIGHTS = { refs: 0.08, script: 0.12, scenes: 0.2 };
const VIDEO_ROW_WEIGHTS = { clips: 0.4, tts: 0.05, music: 0.03, assembly: 0.12 };

/**
 * The overall bar as a function of the checklist rows, which are themselves
 * derived from durable backend state. That is what makes the bar survive a
 * reload: there is no mount-time clock in the number.
 *
 * `target` is what has actually happened. `ceiling` is what the bar would read
 * if every row currently spinning advanced by ONE increment of its own
 * granularity (the next clip, the next narration section, the end of the current
 * script band). The smoother creeps between the two, so it stays alive during a
 * long wait without ever claiming a clip that hasn't rendered.
 *
 * A row carries `weight`, `partial` (0-1, only read while "processing") and
 * `partialStep` (how much one increment moves `partial`, default: the whole row).
 * Failed and warning rows count as settled - they're done, one way or the other.
 */
export function progressFromTasks(tasks = []) {
  let total = 0;
  let now = 0;
  let ahead = 0;

  for (const task of tasks) {
    const weight = task.weight ?? 1;
    total += weight;
    if (task.status === "pending") continue;

    if (task.status === "processing") {
      const partial = clamp01(task.partial);
      now += weight * partial;
      ahead += weight * clamp01(partial + (task.partialStep ?? 1));
    } else {
      now += weight;
      ahead += weight;
    }
  }

  if (total <= 0) return { target: 0, ceiling: 0 };
  return { target: (now / total) * 100, ceiling: (ahead / total) * 100 };
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
// Each row's weight is its share of the phase, taken from its own range span.
export function buildScriptTasks(subSteps, progress) {
  const spans = subSteps.map((s) => Math.max(1, s.range[1] - s.range[0]));
  const spanTotal = spans.reduce((a, b) => a + b, 0);

  return subSteps.map((s, i) => {
    const status = statusForRange(s.range, progress);
    return {
      id: `script-${s.id}`,
      name: s.label,
      status,
      weight: SCRIPT_PHASE_WEIGHT * (spans[i] / spanTotal),
      partial: status === "processing" ? (progress - s.range[0]) / spans[i] : 0,
    };
  });
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
    {
      id: "clips",
      name: "Creating Video Clips",
      description: `${completedClips}/${totalClips} clips complete`,
      icon: Film,
      status: clipsStatus,
      weight: VIDEO_ROW_WEIGHTS.clips,
      partial: totalClips > 0 ? completedClips / totalClips : 0,
      partialStep: 1 / Math.max(totalClips, 1),
    },
    {
      id: "tts",
      name: "Generating Narration",
      description: totalTTS > 0 ? `${completedTTS}/${totalTTS} sections narrated` : "Converting script to speech with AI voice",
      icon: Mic,
      status: ttsStatus,
      weight: VIDEO_ROW_WEIGHTS.tts,
      partial: totalTTS > 0 ? completedTTS / totalTTS : 0,
      partialStep: 1 / Math.max(totalTTS, 1),
    },
    ...(musicEnabled
      ? [{
          id: "music",
          name: "Generating Music",
          description: "Composing background music for your video",
          icon: Music,
          status: musicStatus,
          weight: VIDEO_ROW_WEIGHTS.music,
          partial: musicState === "processing" ? 0.5 : 0,
        }]
      : []),
    // ffmpeg reports no sub-progress, so the assembly row has no `partial` to
    // read - the smoother's creep is the only motion here.
    {
      id: "assembly",
      name: "Assembling Final Video",
      description: "Combining clips and audio",
      icon: Layers,
      status: assemblyStatus,
      weight: VIDEO_ROW_WEIGHTS.assembly,
      partial: 0,
    },
  ];

  if (!started) {
    tasks = tasks.map((t) => ({ ...t, status: "pending" }));
  }

  const failure = deriveFailedStep(session);
  tasks = applyFailure(tasks, failure);

  // No `realProgress` here: the bar comes from progressFromTasks(tasks) so that
  // every caller weighs the same rows the user is looking at. The backend's own
  // `progressData.percentage` spans only the render phase and is already folded
  // into the row statuses and counters above.
  return { tasks, failure };
}
