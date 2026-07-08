import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
import ProgressChecklist from "@/components/session/ProgressChecklist";
import { buildVideoTasks } from "@/lib/progressTasks";

export default function VideoGenerationStep({ session, scriptData, generationError, onRegenerate }) {
  const navigate = useNavigate();
  const progressData = session?.video?.progressData || {};

  // The render-phase rows (clips, narration, music, assembly) come from the shared
  // buildVideoTasks helper — the single source of truth also used by the image,
  // prompt and reference pipelines. Generation is already running when this screen
  // shows directly, so `started` is true.
  const { tasks: stages, realProgress } = buildVideoTasks(session, scriptData, { started: true });

  // Estimated time: clips generate in batches of 3 (~6 min per batch), plus a
  // buffer for final assembly. Narration + music run in parallel with the clips,
  // so they don't add to the estimate.
  const totalClips = progressData.totalClips || (session?.video?.sections?.length ?? 0);
  const CLIP_BATCH_SIZE = 3;
  const MINUTES_PER_BATCH = 6;
  const clipCountForEstimate = totalClips || scriptData?.sections?.length || 0;
  const estimatedMinutes = clipCountForEstimate > 0
    ? Math.ceil(clipCountForEstimate / CLIP_BATCH_SIZE) * MINUTES_PER_BATCH + 4
    : null;
  const estimatedLabel = estimatedMinutes ? `~${estimatedMinutes} minutes` : "a few minutes";

  // Count of clips the backend flags as rendering longer than usual (> ~4 min).
  // While any are slow (and we're not yet assembling/done), swap the estimate
  // caption for a reassurance message.
  const slowClips = progressData.slowClips || 0;
  const isAfter = !!session?.video?.finalVideoUrl || (progressData.stage || "GENERATING") === "ASSEMBLY";

  // Simulated progress: +1% every 5 seconds so the bar doesn't sit at 0.
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedProgress((prev) => Math.min(prev + 1, 40));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
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
      caption={
        slowClips > 0 && !isAfter
          ? "Some clips are taking longer than usual to render. Hang tight, your video is still generating."
          : `This can take ${estimatedLabel} depending on model and clip count.`
      }
      progress={progress}
      tasks={stages}
      headerIcon={Film}
      onLeave={() => navigate("/videos")}
    />
  );
}
