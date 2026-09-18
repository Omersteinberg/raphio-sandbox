import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
import ProgressChecklist from "@/components/session/ProgressChecklist";
import { buildVideoTasks, progressFromTasks } from "@/lib/progressTasks";
import useSmoothProgress from "@/hooks/useSmoothProgress";
import { toast } from "@/lib/toast";

// Minutes a single clip is allowed before the backend gives up and resubmits it.
// Mirrors PIAPI_CLIP_OVERALL_TIMEOUT_MS in video.service.js, and is what one
// retry round costs, so it is also what each round adds to the estimate.
const RETRY_MINUTES = 8;

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
  const { tasks: stages, failure } = buildVideoTasks(activeSession, scriptData, { started: true });

  // Estimated time: clips generate in batches of 3 (~6 min per batch), plus a
  // buffer for final assembly. Narration + music run in parallel with the clips,
  // so they don't add to the estimate.
  const totalClips = progressData.totalClips || (activeSession?.video?.sections?.length ?? 0);
  const CLIP_BATCH_SIZE = 3;
  const MINUTES_PER_BATCH = 6;
  const clipCountForEstimate = totalClips || scriptData?.sections?.length || 0;

  // Deepest retry round any clip has reached (0, 1 or 2). The backend resubmits a
  // clip that fails or overruns its cap, and each round pushes the finish line out
  // by roughly one clip timeout, so the estimate has to grow with it or the bar
  // sits at a number the render can no longer hit.
  const clipRetries = progressData.clipRetries || 0;

  const estimatedMinutes = clipCountForEstimate > 0
    ? Math.ceil(clipCountForEstimate / CLIP_BATCH_SIZE) * MINUTES_PER_BATCH + 4 + clipRetries * RETRY_MINUTES
    : null;
  const estimatedLabel = estimatedMinutes ? `~${estimatedMinutes} minutes` : "a few minutes";

  // Announce each new retry round once. The ref is seeded with whatever the first
  // render observes rather than 0, so reopening the page mid-generation does not
  // replay a toast for a retry that already happened while the user was away.
  const seenRetries = useRef(null);
  useEffect(() => {
    if (seenRetries.current === null) {
      seenRetries.current = clipRetries;
      return;
    }
    if (clipRetries > seenRetries.current) {
      seenRetries.current = clipRetries;
      toast.info(
        "A clip failed to render, so we automatically resubmitted it. This will take a little longer, we'll email you when your video is ready.",
      );
    }
  }, [clipRetries]);

  // Count of clips the backend flags as rendering longer than usual (> ~4 min).
  // While any are slow (and we're not yet assembling/done), swap the estimate
  // caption for a reassurance message.
  const slowClips = progressData.slowClips || 0;
  const isAfter = !!activeSession?.video?.finalVideoUrl || (progressData.stage || "GENERATING") === "ASSEMBLY";

  // Every render on the server shares a small pool of assembly slots. When they are
  // all busy this video waits its turn, which without a caption is indistinguishable
  // from a stuck progress bar. Deliberately NOT gated on !isAfter the way slowClips
  // is: the wait happens DURING assembly, which is exactly when isAfter is true.
  const queuedForCapacity = !!progressData.queuedForCapacity;

  // The bar is a weighted function of the rows, which come from the backend
  // snapshot - so it resumes at the real percentage. This screen only spans the
  // render phase, so the rows above are the whole 0-100.
  const { target, ceiling } = progressFromTasks(stages);
  const progress = useSmoothProgress({
    target,
    ceiling,
    done: !!activeSession?.video?.finalVideoUrl,
  });

  const fatal = !!generationError || !!failure?.fatal || activeSession?.video?.status === "FAILED";

  if (fatal) {

    const attributed = !!failure?.fatal && !!failure.rowId;

    const providerDown = progressData.code === "PROVIDER_UNAVAILABLE";
    // Every render slot stayed busy for the whole wait. Nothing is broken and the
    // video itself is fine, so this reads as "come back shortly", not as a failure.
    const atCapacity = progressData.code === "AT_CAPACITY";
    const message = atCapacity
      ? "We were at maximum capacity and couldn't start your video in time."
      : failure?.displayReason || "Something went wrong while generating your video.";

    return (
      <ProgressChecklist
        headerIcon={Film}
        sessionId={activeSession?.id}
        tasks={attributed ? stages : []}
        failure={{
          title: atCapacity ? "We're at Capacity" : "Generation Failed",
          subtitle: atCapacity
            ? "Too many videos are being made right now."
            : "We couldn't finish generating your video.",
          message,
          hint: (
            <>
              {providerDown
                ? "You won't be charged extra."
                : atCapacity
                  ? "Please try again in a few minutes. You won't be charged extra."
                  : "Please click Regenerate below. You won't be charged extra."}{" "}
              If you'd rather have a refund for this video, email{" "}
              <a href="mailto:mikhalangelo156@gmail.com" className="text-terra underline">
                mikhalangelo156@gmail.com
              </a>
              .
            </>
          ),
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
        queuedForCapacity
          ? "We're at maximum capacity right now, so your video is queued. It will finish on its own, you don't need to stay on this page."
          : clipRetries > 0 && !isAfter
            // Outranks the slow-clip notice: a resubmit is the more specific and more
            // reassuring thing to say, and it carries the estimate the toast promised.
            ? `A clip failed and we resubmitted it automatically. This can now take ${estimatedLabel}, and you don't need to stay on this page. We'll email you when your video is ready.`
            : slowClips > 0 && !isAfter
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
