import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Mic, Layers, Music, Image } from "lucide-react";
import ProgressChecklist from "@/components/session/ProgressChecklist";

export default function GeneratingStep({ session, scriptData, generationError, onRegenerate }) {
  const navigate = useNavigate();
  const sections = session?.video?.sections || [];
  const completedSections = sections.filter((s) => s.status === "COMPLETED").length;
  const totalSections = sections.length;

  // Get progress data from backend (if available)
  const progressData = session?.video?.progressData || {};
  const currentStage = progressData.stage || "GENERATING";
  // The sections array already includes any opening/closing clips, so it is the
  // authoritative clip count (intro/outro are optional). progressData wins once
  // the first poll lands.
  const totalClips = progressData.totalClips || totalSections;
  const completedClips = progressData.completedClips ?? progressData.currentClip ?? completedSections;
  const completedTTS = progressData.completedTTS || 0;
  const totalTTS = progressData.totalTTS || 0;
  const musicState = progressData.musicState || null;

  const musicEnabled = musicState ? musicState !== "skipped" : !!session?.video?.backgroundMusicEnabled;
  const isDone = !!session?.video?.finalVideoUrl;
  const isAssembly = currentStage === "ASSEMBLY";

  // Clips, narration and music now run in PARALLEL, so each shows its own live
  // status simultaneously during the generating phase; assembly comes after.
  const after = isDone || isAssembly; // generating phase finished
  const allClipsDone = totalClips > 0 && completedClips >= totalClips;
  const allTtsDone = totalTTS === 0 || completedTTS >= totalTTS;

  const restyleStatus = "completed"; // restyle (if any) precedes the generating phase
  const clipsStatus = after || allClipsDone ? "completed" : "processing";
  const ttsStatus = after || allTtsDone ? "completed" : "processing";
  const musicStatus = after || musicState === "done" || musicState === "failed"
    ? "completed"
    : "processing";
  const assemblyStatus = isDone ? "completed" : isAssembly ? "processing" : "pending";

  // Estimated time: clips generate in batches of 3 (~6 min per batch), plus a
  // buffer for final assembly. Narration + music run in parallel with the
  // clips, so they don't add to the estimate.
  const CLIP_BATCH_SIZE = 3;
  const MINUTES_PER_BATCH = 6;
  const clipCountForEstimate = totalClips || scriptData?.sections?.length || 0;
  const estimatedMinutes = clipCountForEstimate > 0
    ? Math.ceil(clipCountForEstimate / CLIP_BATCH_SIZE) * MINUTES_PER_BATCH + 4
    : null;
  const estimatedLabel = estimatedMinutes ? `~${estimatedMinutes} minutes` : "a few minutes";

  const stages = [
    ...(session?.restyled ? [{
      id: "restyle",
      name: "Restyling Images",
      description: "Applying visual style to uploaded images",
      icon: Image,
      status: restyleStatus,
    }] : []),
    {
      id: "clips",
      name: "Creating Video Clips",
      description: `${completedClips}/${totalClips} clips complete`,
      icon: Film,
      status: clipsStatus,
    },
    {
      id: "tts",
      name: "Generating Narration",
      description: totalTTS > 0
        ? `${completedTTS}/${totalTTS} sections narrated`
        : "Converting script to speech with AI voice",
      icon: Mic,
      status: ttsStatus,
    },
    ...(musicEnabled ? [{
      id: "music",
      name: "Generating Music",
      description: "Composing background music for your video",
      icon: Music,
      status: musicStatus,
    }] : []),
    {
      id: "assembly",
      name: "Assembling Final Video",
      description: "Combining clips and audio",
      icon: Layers,
      status: assemblyStatus,
    },
  ];

  // Simulated progress: +1% every 5 seconds so bar doesn't sit at 0
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedProgress((prev) => Math.min(prev + 1, 40));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate overall progress (use backend progress if available)
  const realProgress = progressData.percentage ?? Math.round(
    ((completedSections / Math.max(totalSections, 1)) * 70) +
    (session?.video?.narrationUrl ? 15 : 0) +
    (session?.video?.finalVideoUrl ? 15 : 0)
  );
  const progress = Math.max(simulatedProgress, realProgress);

  // Failure state: generation failed; show the error and let the user regenerate.
  const failed = !!generationError || progressData.stage === "FAILED" || session?.video?.status === "FAILED";
  const errorMessage = generationError || progressData.error || "Something went wrong while generating your video.";

  if (failed) {
    return (
      <ProgressChecklist
        headerIcon={Film}
        failure={{
          title: "Generation Failed",
          subtitle: "We couldn't finish generating your video.",
          message: errorMessage,
          hint: "Your credits were refunded. You can try generating again.",
          onRetry: onRegenerate,
          retryLabel: "Regenerate Video",
        }}
      />
    );
  }

  return (
    <ProgressChecklist
      title="Creating Your Video"
      subtitle={`${scriptData?.title || "Your video"} is being generated`}
      caption={`This can take ${estimatedLabel} depending on model and clip count.`}
      progress={progress}
      tasks={stages}
      headerIcon={Film}
      onLeave={() => navigate("/videos")}
    />
  );
}
