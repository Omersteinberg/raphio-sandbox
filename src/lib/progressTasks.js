// Builders for the shared ProgressChecklist task lists. Used to compose a single
// continuous checklist across phases (script generation -> video generation) when
// a run is fully automatic, so the user sees one list instead of two screens.
import { Film, Mic, Layers, Music, Image } from "lucide-react";

export function statusForRange(range, progress) {
  if (progress >= range[1]) return "completed";
  if (progress >= range[0]) return "processing";
  return "pending";
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
// running while an earlier phase is still going).
export function buildVideoTasks(session, scriptData, { started = true } = {}) {
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
  const musicEnabled = musicState ? musicState !== "skipped" : !!session?.video?.backgroundMusicEnabled;
  const isDone = !!session?.video?.finalVideoUrl;
  const isAssembly = currentStage === "ASSEMBLY";
  const after = isDone || isAssembly;
  const allClipsDone = totalClips > 0 && completedClips >= totalClips;
  const allTtsDone = totalTTS === 0 || completedTTS >= totalTTS;

  const clipsStatus = after || allClipsDone ? "completed" : "processing";
  const ttsStatus = after || allTtsDone ? "completed" : "processing";
  const musicStatus = after || musicState === "done" || musicState === "failed" ? "completed" : "processing";
  const assemblyStatus = isDone ? "completed" : isAssembly ? "processing" : "pending";

  let tasks = [
    ...(session?.restyled
      ? [{ id: "restyle", name: "Restyling Images", description: "Applying visual style to uploaded images", icon: Image, status: "completed" }]
      : []),
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

  const realProgress = progressData.percentage ?? Math.round(
    ((completedSections / Math.max(totalSections, 1)) * 70) +
    (session?.video?.narrationUrl ? 15 : 0) +
    (session?.video?.finalVideoUrl ? 15 : 0)
  );

  return { tasks, realProgress };
}
