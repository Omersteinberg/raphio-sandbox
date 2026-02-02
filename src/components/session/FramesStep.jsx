import { motion } from "framer-motion";
import { Film, Play, Square, Mic, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const VIDEO_MODELS = [
  { id: "KLING", name: "Kling", description: "Best for cinematic motion" },
  { id: "HUNYUAN", name: "Hunyuan", description: "Good for realistic content" },
  { id: "WAN", name: "Wan", description: "Fast for social media" },
  { id: "LUMA", name: "Luma", description: "Dramatic effects" },
];

export default function FramesStep({
  openingFrame,
  setOpeningFrame,
  closingFrame,
  setClosingFrame,
  videoModel,
  setVideoModel,
  voiceId,
  setVoiceId,
  configureFrames,
  startGeneration,
  loading,
}) {
  const handleOpeningChange = (field, value) => {
    setOpeningFrame({ ...openingFrame, [field]: value });
  };

  const handleClosingChange = (field, value) => {
    setClosingFrame({ ...closingFrame, [field]: value });
  };

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

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      {/* Left Side - Frame Configuration */}
      <div className="flex-1 flex flex-col p-6 border-r border-gray-100 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Configure Frames</h2>
          <p className="text-sm text-gray-600">
            Add opening and closing frames to your video
          </p>
        </div>

        {/* Opening Frame */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Opening Frame</h3>
                <p className="text-xs text-gray-500">Title card at the start</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={openingFrame.enabled}
                onChange={(e) => handleOpeningChange("enabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {openingFrame.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Custom Prompt (optional)
                </label>
                <Textarea
                  value={openingFrame.customPrompt}
                  onChange={(e) => handleOpeningChange("customPrompt", e.target.value)}
                  placeholder="Describe your opening frame or leave empty for auto-generation..."
                  className="text-sm"
                  rows={2}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Closing Frame */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Square className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Closing Frame</h3>
                <p className="text-xs text-gray-500">End card with CTA</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={closingFrame.enabled}
                onChange={(e) => handleClosingChange("enabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {closingFrame.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Call to Action
                </label>
                <Input
                  value={closingFrame.callToAction}
                  onChange={(e) => handleClosingChange("callToAction", e.target.value)}
                  placeholder="e.g., Visit our website, Follow us, Subscribe..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  Custom Prompt (optional)
                </label>
                <Textarea
                  value={closingFrame.customPrompt}
                  onChange={(e) => handleClosingChange("customPrompt", e.target.value)}
                  placeholder="Describe your closing frame or leave empty for auto-generation..."
                  className="text-sm"
                  rows={2}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Start Generation Button */}
        <Button
          onClick={handleStartGeneration}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Starting Generation...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              Start Video Generation
              <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </Button>
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
          <select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-200 bg-white text-gray-900"
          >
            <option value="adam">Adam (Male)</option>
            <option value="rachel">Rachel (Female)</option>
            <option value="drew">Drew (Male)</option>
            <option value="sarah">Sarah (Female)</option>
            <option value="charlie">Charlie (Male)</option>
            <option value="emily">Emily (Female)</option>
            <option value="james">James (Male)</option>
            <option value="charlotte">Charlotte (Female)</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            The selected voice will be used for all narration
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-auto p-4 bg-purple-100 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>What happens next:</strong>
          </p>
          <ul className="text-xs text-purple-700 mt-2 space-y-1">
            <li>• Opening/closing frames generated with DALL-E 3</li>
            <li>• Each section converted to video clips</li>
            <li>• Narration generated with AI voice</li>
            <li>• Final video assembled automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
