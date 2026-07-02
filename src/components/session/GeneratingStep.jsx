import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Film, Mic, Layers, Music, Check, Loader2, Image, ArrowRight } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";

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
      <div className="w-full h-full flex flex-col items-center overflow-y-auto px-4 py-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center my-auto"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <Film className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Generation Failed</h1>
          <p className="text-ink-muted mb-4">We couldn't finish generating your video.</p>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-left mb-6">
            <p className="text-sm text-red-800 break-words">{errorMessage}</p>
          </div>
          <p className="text-sm text-ink-muted mb-6">
            Your credits were refunded. You can try generating again.
          </p>
          <button
            onClick={onRegenerate}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Film className="w-5 h-5" />
            Regenerate Video
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center overflow-y-auto px-4 py-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-terra/10 rounded-full mb-4"
          >
            <Film className="w-10 h-10 text-terra" />
          </motion.div>
          <h1 className="text-2xl font-bold text-ink mb-2">
            Creating Your Video
          </h1>
          <p className="text-ink-muted">
            {scriptData?.title || "Your video"} is being generated
          </p>
          <p className="text-ink-muted text-sm mt-1">
            This can take {estimatedLabel} depending on model and clip count.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-ink-muted mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} showPercent={false} />
        </div>

        {/* Stage List */}
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = stage.status === "processing";
            const isComplete = stage.status === "completed";

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  isActive
                    ? "border-terra bg-terra/5"
                    : isComplete
                    ? "border-green-200 bg-green-50"
                    : "border-border bg-surface-alt"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-terra/10"
                      : isComplete
                      ? "bg-green-100"
                      : "bg-surface-alt"
                  }`}
                >
                  {isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2
                        className={`w-6 h-6 ${
                          isActive ? "text-terra" : "text-ink-muted"
                        }`}
                      />
                    </motion.div>
                  ) : isComplete ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <Icon className="w-6 h-6 text-ink-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-medium ${
                      isActive
                        ? "text-terra"
                        : isComplete
                        ? "text-green-900"
                        : "text-ink-muted"
                    }`}
                  >
                    {stage.name}
                  </h3>
                  <p
                    className={`text-sm ${
                      isActive
                        ? "text-terra"
                        : isComplete
                        ? "text-green-600"
                        : "text-ink-muted"
                    }`}
                  >
                    {stage.description}
                  </p>
                </div>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Processing Note */}
        <div className="mt-8 p-4 bg-terra/5 rounded-lg border border-terra/20 text-center">
          <p className="text-sm text-terra-dark">
            You can leave this page; your video will keep generating in the background.
            Come back to My Videos to check progress.
          </p>
          <button
            type="button"
            onClick={() => navigate("/videos")}
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-terra/25 bg-white text-sm font-medium text-terra hover:bg-terra/5 transition-colors"
          >
            Go to My Videos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
