import { motion } from "framer-motion";
import { Film, Mic, Layers, Check, Loader2, Image } from "lucide-react";

export default function GeneratingStep({ session, scriptData }) {
  const sections = session?.video?.sections || [];
  const completedSections = sections.filter((s) => s.status === "COMPLETED").length;
  const totalSections = sections.length;

  // Get progress data from backend (if available)
  const progressData = session?.video?.progressData || {};
  const currentStage = progressData.stage || "TTS";
  const currentClip = progressData.currentClip || 0;
  const totalClips = progressData.totalClips || totalSections;
  const completedTTS = progressData.completedTTS || 0;
  const totalTTS = progressData.totalTTS || 0;

  // Determine stage statuses based on progressData
  const ttsStatus = (() => {
    if (completedTTS >= totalTTS && totalTTS > 0) return "completed";
    if (currentStage === "TTS") return "processing";
    if (currentStage === "CLIPS" || currentStage === "ASSEMBLY") return "completed";
    return "processing";
  })();

  const clipsStatus = (() => {
    if (completedSections >= totalClips && totalClips > 0) return "completed";
    if (currentStage === "CLIPS") return "processing";
    if (currentStage === "ASSEMBLY") return "completed";
    return "pending";
  })();

  const assemblyStatus = (() => {
    if (session?.video?.finalVideoUrl) return "completed";
    if (currentStage === "ASSEMBLY") return "processing";
    return "pending";
  })();

  const stages = [
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
      id: "clips",
      name: "Creating Video Clips",
      description: currentStage === "CLIPS" && currentClip > 0
        ? `Generating clip ${currentClip} of ${totalClips}`
        : `${completedSections}/${totalClips} clips complete`,
      icon: Film,
      status: clipsStatus,
    },
    {
      id: "assembly",
      name: "Assembling Final Video",
      description: "Combining clips and audio",
      icon: Layers,
      status: assemblyStatus,
    },
  ];

  // Calculate overall progress (use backend progress if available)
  const progress = progressData.percentage || Math.round(
    ((completedSections / Math.max(totalSections, 1)) * 70) +
    (session?.video?.narrationUrl ? 15 : 0) +
    (session?.video?.finalVideoUrl ? 15 : 0)
  );

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

        {/* Clip Progress Grid */}
        {currentStage === "CLIPS" && sections.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-3 text-center">Individual Clip Status</p>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {sections.filter(s => s.sectionType === "CONTENT").map((section, idx) => {
                const isCompleted = section.status === "COMPLETED";
                const isGenerating = section.status === "GENERATING";
                const isFailed = section.status === "FAILED";

                return (
                  <motion.div
                    key={section.id || idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                      isCompleted
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : isGenerating
                        ? "bg-purple-100 text-purple-700 border border-purple-300"
                        : isFailed
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : isGenerating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-4 h-4" />
                      </motion.div>
                    ) : isFailed ? (
                      "!"
                    ) : (
                      idx + 1
                    )}
                    {section.imageUrl && isCompleted && (
                      <div className="absolute inset-0 rounded-lg overflow-hidden opacity-30">
                        <img
                          src={section.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Processing Note */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <p className="text-sm text-blue-800">
            This may take several minutes depending on your video length.
            <br />
            You can leave this page open - we'll notify you when it's ready.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
