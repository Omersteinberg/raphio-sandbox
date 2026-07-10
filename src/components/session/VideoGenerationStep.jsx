import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
import ProgressChecklist from "@/components/session/ProgressChecklist";
import { buildVideoTasks } from "@/lib/progressTasks";

export default function VideoGenerationStep({ session, failedSession, scriptData, generationError, onRegenerate }) {
  const navigate = useNavigate();

  // The polling hooks deliberately skip setSession on failure (the backend rolls
  // the stage back, which would bounce the user off this screen), so `session`
  // is the last healthy snapshot. `failedSession` is the FAILED payload captured
  // alongside it, and it's the only object carrying the failed section statuses
  // and the error string.
  const activeSession = failedSession ?? session;
  const progressData = activeSession?.video?.progressData || {};

  // The render-phase rows (clips, narration, music, assembly) come from the shared
  // buildVideoTasks helper - the single source of truth also used by the image,
  // prompt and reference pipelines. Generation is already running when this screen
  // shows directly, so `started` is true.
  const { tasks: stages, realProgress, failure } = buildVideoTasks(activeSession, scriptData, { started: true });

  // Estimated time: clips generate in batches of 3 (~6 min per batch), plus a
  // buffer for final assembly. Narration + music run in parallel with the clips,
  // so they don't add to the estimate.
  const totalClips = progressData.totalClips || (activeSession?.video?.sections?.length ?? 0);
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
  const isAfter = !!activeSession?.video?.finalVideoUrl || (progressData.stage || "GENERATING") === "ASSEMBLY";

  // Simulated progress: +1% every 5 seconds so the bar doesn't sit at 0.
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedProgress((prev) => Math.min(prev + 1, 40));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  const progress = Math.max(simulatedProgress, realProgress);

  const fatal = !!generationError || !!failure?.fatal || activeSession?.video?.status === "FAILED";

  if (fatal) {
    // deriveFailedStep returns rowId:null when the failure cannot honestly be
    // pinned to a step. Passing no tasks then falls back to the standalone error
    // card rather than reddening an arbitrary row.
    const attributed = !!failure?.fatal && !!failure.rowId;
    const message = failure?.reason || generationError || progressData.error || "Something went wrong while generating your video.";

    return (
      <ProgressChecklist
        headerIcon={Film}
        sessionId={activeSession?.id}
        tasks={attributed ? stages : []}
        failure={{
          title: "Generation Failed",
          subtitle: "We couldn't finish generating your video.",
          message,
          hint: "Retrying is free. You won't be charged again.",
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
      sessionId={activeSession?.id}
      onLeave={() => navigate("/videos")}
    />
  );
}
