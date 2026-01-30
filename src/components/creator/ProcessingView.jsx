import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle, Clock, Mic2, Video, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProcessingView({
  progress,
  processingError,
  onRetry,
  onCancel,
}) {
  // Calculate overall progress percentage
  const getOverallProgress = () => {
    if (!progress) return 0;

    let completed = 0;
    let total = 3; // TTS, Sections, Assembly

    if (progress.tts === "COMPLETED") completed += 1;
    if (progress.assembly === "COMPLETED") completed += 1;

    if (progress.sections) {
      const sectionProgress =
        progress.sections.completed / (progress.sections.total || 1);
      completed += sectionProgress;
    }

    return Math.round((completed / total) * 100);
  };

  const stages = [
    {
      key: "tts",
      label: "Generating Narration",
      description: "Creating AI voice narration from your script",
      icon: <Mic2 className="w-5 h-5" />,
      status: progress?.tts || "PENDING",
    },
    {
      key: "sections",
      label: "Creating Video Clips",
      description: progress?.sections
        ? `Processing ${progress.sections.completed} of ${progress.sections.total} clips`
        : "Generating video from your images",
      icon: <Video className="w-5 h-5" />,
      status:
        progress?.sections?.completed === progress?.sections?.total
          ? "COMPLETED"
          : progress?.sections?.completed > 0
          ? "PROCESSING"
          : "PENDING",
    },
    {
      key: "assembly",
      label: "Assembling Final Video",
      description: "Combining clips and audio into your final video",
      icon: <Film className="w-5 h-5" />,
      status: progress?.assembly || "PENDING",
    },
  ];

  const funFacts = [
    "Did you know? 85% of videos are watched without sound on social media.",
    "AI can generate videos 10x faster than traditional editing.",
    "Short-form video is the fastest-growing content format online.",
    "Videos with captions get 40% more engagement.",
  ];

  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];

  if (processingError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-2xl mx-auto text-center">
          <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-sm">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Something Went Wrong
            </h2>
            <p className="text-gray-600 mb-6">{processingError}</p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={onRetry}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Try Again
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Start Over
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your Video
          </h1>
          <p className="text-gray-600">This usually takes a few minutes.</p>
        </div>

        {/* Progress Circle */}
        <div className="relative w-48 h-48 mx-auto mb-12">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              className="fill-none stroke-gray-200"
              strokeWidth="8"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="88"
              className="fill-none stroke-purple-600"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 553" }}
              animate={{
                strokeDasharray: `${(getOverallProgress() / 100) * 553} 553`,
              }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl font-bold text-gray-900">
                {getOverallProgress()}%
              </span>
              <span className="block text-gray-600 text-sm">Complete</span>
            </div>
          </div>
        </div>

        {/* Stage Breakdown */}
        <div className="space-y-4 mb-12">
          {stages.map((stage, index) => {
            const isActive = stage.status === "PROCESSING";
            const isComplete = stage.status === "COMPLETED";
            const isFailed = stage.status === "FAILED";

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-center gap-4 p-4 rounded-xl border bg-white
                  ${
                    isActive
                      ? "border-purple-300 shadow-sm"
                      : isComplete
                      ? "border-green-300"
                      : isFailed
                      ? "border-red-300"
                      : "border-gray-200"
                  }
                `}
              >
                {/* Icon */}
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${
                    isActive
                      ? "bg-purple-100 text-purple-600"
                      : isComplete
                      ? "bg-green-100 text-green-600"
                      : isFailed
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-500"
                  }
                `}
                >
                  {isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : isFailed ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    stage.icon
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3
                    className={`font-medium ${
                      isActive
                        ? "text-purple-700"
                        : isComplete
                        ? "text-green-700"
                        : isFailed
                        ? "text-red-700"
                        : "text-gray-900"
                    }`}
                  >
                    {stage.label}
                  </h3>
                  <p className="text-sm text-gray-600">{stage.description}</p>
                </div>

                {/* Status */}
                <div className="text-right">
                  {isActive && (
                    <span className="text-purple-600 text-sm font-medium">In Progress</span>
                  )}
                  {isComplete && (
                    <span className="text-green-600 text-sm font-medium">Done</span>
                  )}
                  {isFailed && (
                    <span className="text-red-600 text-sm font-medium">Failed</span>
                  )}
                  {stage.status === "PENDING" && (
                    <span className="text-gray-500 text-sm">Waiting</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Fun Fact */}
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-100 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="text-purple-700 text-sm font-medium">While you wait...</span>
          </div>
          <p className="text-gray-700">{randomFact}</p>
        </div>

        {/* Tip */}
        <p className="text-center text-gray-500 text-sm mt-6">
          You can safely close this page. Your video will continue processing.
        </p>
      </div>
    </div>
  );
}
