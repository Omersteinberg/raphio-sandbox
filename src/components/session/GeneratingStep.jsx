import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Film, Mic, Layers, Check, Loader2, Image } from "lucide-react";

export default function GeneratingStep({ session, scriptData, openingFrame, closingFrame, generationError, onRegenerate }) {
  const sections = session?.video?.sections || [];
  const completedSections = sections.filter((s) => s.status === "COMPLETED").length;
  const totalSections = sections.length;

  // Frames are mandatory: always 2 extra clips (opening + closing).
  const extraFrames = 2;

  // Get progress data from backend (if available)
  const progressData = session?.video?.progressData || {};
  const currentStage = progressData.stage || "CLIPS";
  const currentClip = progressData.currentClip || 0;
  const totalClips = progressData.totalClips || (totalSections + extraFrames);
  const completedTTS = progressData.completedTTS || 0;
  const totalTTS = progressData.totalTTS || 0;

  // Determine stage statuses based on progressData
  // Order: Restyle → Clips → TTS → Assembly
  const restyleStatus = (() => {
    if (currentStage === "RESTYLE") return "processing";
    if (currentStage === "CLIPS" || currentStage === "TTS" || currentStage === "ASSEMBLY") return "completed";
    if (!session?.restyled) return "completed";
    return "pending";
  })();

  const clipsStatus = (() => {
    if (completedSections >= totalClips && totalClips > 0) return "completed";
    if (currentStage === "CLIPS") return "processing";
    if (currentStage === "TTS" || currentStage === "ASSEMBLY") return "completed";
    return "processing";
  })();

  const ttsStatus = (() => {
    if (completedTTS >= totalTTS && totalTTS > 0) return "completed";
    if (currentStage === "TTS") return "processing";
    if (currentStage === "ASSEMBLY") return "completed";
    return "pending";
  })();

  const assemblyStatus = (() => {
    if (session?.video?.finalVideoUrl) return "completed";
    if (currentStage === "ASSEMBLY") return "processing";
    return "pending";
  })();

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
      description: currentStage === "CLIPS" && currentClip > 0
        ? `Generating clip ${currentClip} of ${totalClips}`
        : `${completedSections}/${totalClips} clips complete`,
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

  // Native browser beforeunload warning (for tab close / URL change)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedProgress((prev) => Math.min(prev + 1, 40));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate overall progress (use backend progress if available)
  const realProgress = progressData.percentage || Math.round(
    ((completedSections / Math.max(totalSections, 1)) * 70) +
    (session?.video?.narrationUrl ? 15 : 0) +
    (session?.video?.finalVideoUrl ? 15 : 0)
  );
  const progress = Math.max(simulatedProgress, realProgress);

  // Failure state — generation failed; show the error and let the user regenerate.
  const failed = !!generationError || progressData.stage === "FAILED" || session?.video?.status === "FAILED";
  const errorMessage = generationError || progressData.error || "Something went wrong while generating your video.";

  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <Film className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Generation Failed</h1>
          <p className="text-gray-600 mb-4">We couldn't finish generating your video.</p>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-left mb-6">
            <p className="text-sm text-red-800 break-words">{errorMessage}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Your credits were refunded. You can try generating again.
          </p>
          <button
            onClick={onRegenerate}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
          >
            <Film className="w-5 h-5" />
            Regenerate Video
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4"
          >
            <Film className="w-10 h-10 text-purple-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your Video
          </h1>
          <p className="text-gray-600">
            {scriptData?.title || "Your video"} is being generated
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
            />
          </div>
        </div>

        {/* Stage List */}
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = stage.status === "processing";
            const isComplete = stage.status === "completed";
            const isPending = stage.status === "pending";

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  isActive
                    ? "border-purple-500 bg-purple-50"
                    : isComplete
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-purple-100"
                      : isComplete
                      ? "bg-green-100"
                      : "bg-gray-100"
                  }`}
                >
                  {isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2
                        className={`w-6 h-6 ${
                          isActive ? "text-purple-600" : "text-gray-400"
                        }`}
                      />
                    </motion.div>
                  ) : isComplete ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <Icon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-medium ${
                      isActive
                        ? "text-purple-900"
                        : isComplete
                        ? "text-green-900"
                        : "text-gray-500"
                    }`}
                  >
                    {stage.name}
                  </h3>
                  <p
                    className={`text-sm ${
                      isActive
                        ? "text-purple-600"
                        : isComplete
                        ? "text-green-600"
                        : "text-gray-400"
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
        <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
          <p className="text-sm text-amber-800">
            This may take several minutes depending on your video length.
            <br />
            <strong>Do not close or reload this page.</strong> Credits will not be refunded if you leave.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
