import { motion } from "framer-motion";
import { Film, Mic, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceSelector from "./VoiceSelector";

const VIDEO_MODELS = [
  { id: "KLING", name: "Kling", description: "Best for cinematic motion" },
  { id: "HUNYUAN", name: "Hunyuan", description: "Good for realistic content" },
  { id: "WAN", name: "Wan", description: "Fast for social media" },
  { id: "LUMA", name: "Luma", description: "Dramatic effects" },
];

export default function FramesStep({
  openingFrame,
  closingFrame,
  videoModel,
  setVideoModel,
  voiceId,
  setVoiceId,
  configureFrames,
  startGeneration,
}) {
  const handleStartGeneration = async () => {
    console.log("[FramesStep] handleStartGeneration called");
    console.log("[FramesStep] openingFrame:", openingFrame);
    console.log("[FramesStep] closingFrame:", closingFrame);
    console.log("[FramesStep] videoModel:", videoModel);
    console.log("[FramesStep] voiceId:", voiceId);

    try {
      console.log("[FramesStep] Calling configureFrames...");
      await configureFrames();
      console.log("[FramesStep] configureFrames completed");

      console.log("[FramesStep] Calling startGeneration...");
      await startGeneration();
      console.log("[FramesStep] startGeneration completed");
    } catch (err) {
      console.error("[FramesStep] Error in handleStartGeneration:", err);
    }
  };

  // Count enabled frames for summary
  const framesSummary = [];
  if (openingFrame?.enabled) framesSummary.push("Opening");
  if (closingFrame?.enabled) framesSummary.push("Closing");

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      {/* Left Side - Summary & Start */}
      <div className="flex-1 flex flex-col p-6 border-r border-gray-100 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Ready to Generate</h2>
          <p className="text-sm text-gray-600">
            Review your settings and start video generation
          </p>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4 mb-6">
          {/* Frames Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Frames</h3>
            {framesSummary.length > 0 ? (
              <p className="text-sm text-gray-600">
                {framesSummary.join(" & ")} frame{framesSummary.length > 1 ? "s" : ""} will be generated
              </p>
            ) : (
              <p className="text-sm text-gray-500">No opening/closing frames configured</p>
            )}
            {openingFrame?.enabled && openingFrame?.useUpload && openingFrame?.uploadedImage && (
              <div className="mt-2 flex items-center gap-2">
                <img src={openingFrame.uploadedImage} alt="Opening" className="w-12 h-12 object-cover rounded" />
                <span className="text-xs text-gray-500">Custom opening image</span>
              </div>
            )}
            {closingFrame?.enabled && closingFrame?.useUpload && closingFrame?.uploadedImage && (
              <div className="mt-2 flex items-center gap-2">
                <img src={closingFrame.uploadedImage} alt="Closing" className="w-12 h-12 object-cover rounded" />
                <span className="text-xs text-gray-500">Custom closing image</span>
              </div>
            )}
          </div>

          {/* Model Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Video AI Model</h3>
            <p className="text-sm text-gray-600">
              {VIDEO_MODELS.find(m => m.id === videoModel)?.name || videoModel} - {VIDEO_MODELS.find(m => m.id === videoModel)?.description}
            </p>
          </div>

          {/* Voice Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Narration Voice</h3>
            <p className="text-sm text-gray-600">
              {voiceId || "Default voice"}
            </p>
          </div>
        </div>

        {/* Start Generation Button */}
        <Button
          onClick={handleStartGeneration}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Start Video Generation
            <ArrowRight className="w-5 h-5" />
          </span>
        </Button>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>What happens next:</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            {openingFrame?.enabled && <li>• Opening frame generated with DALL-E 3</li>}
            <li>• Each section converted to video clips</li>
            <li>• Narration generated with AI voice</li>
            {closingFrame?.enabled && <li>• Closing frame generated with DALL-E 3</li>}
            <li>• Final video assembled automatically</li>
          </ul>
        </div>
      </div>

      {/* Right Side - Model & Voice Selection */}
      <div className="w-full lg:w-96 flex flex-col bg-gray-50 p-6 overflow-y-auto">
        {/* Video Model Selection */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Film className="w-4 h-4" />
            Video AI Model
          </h3>
          <div className="space-y-2">
            {VIDEO_MODELS.map((model) => (
              <motion.button
                key={model.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setVideoModel(model.id)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  videoModel === model.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="font-medium text-gray-900 block">{model.name}</span>
                <span className="text-xs text-gray-500">{model.description}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Narration Voice
          </h3>
          <VoiceSelector value={voiceId} onChange={setVoiceId} />
          <p className="text-xs text-gray-500 mt-2">
            Click the play button to preview any voice before selecting
          </p>
        </div>
      </div>
    </div>
  );
}
