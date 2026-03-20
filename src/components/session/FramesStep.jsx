import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Music, ArrowRight, Zap, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceSelector from "./VoiceSelector";

export default function FramesStep({
  openingFrame,
  closingFrame,
  voiceId,
  setVoiceId,
  backgroundMusic,
  setBackgroundMusic,
  configureFrames,
  startGeneration,
}) {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleStartGeneration = async () => {
    try {
      await configureFrames();
      await startGeneration();
    } catch (err) {
      console.error("[FramesStep] Error in handleStartGeneration:", err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-2xl px-6 py-8 space-y-4">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-xl font-semibold text-gray-900">Ready to Generate</h2>
          <p className="text-sm text-gray-600">
            Confirm your settings and start video generation
          </p>
        </div>

        {/* Narration Voice Accordion */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection("voice")}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Mic className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Narration Voice</p>
                <p className="text-sm text-gray-500">
                  {voiceId || "Default voice"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {voiceId && (
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
              )}
              <motion.div
                animate={{ rotate: expandedSection === "voice" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expandedSection === "voice" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <VoiceSelector value={voiceId} onChange={setVoiceId} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Background Music Toggle */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setBackgroundMusic(!backgroundMusic)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Music className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Background Music</p>
                <p className="text-sm text-gray-500">
                  {backgroundMusic ? "AI-generated instrumental music" : "No background music"}
                </p>
              </div>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                backgroundMusic ? "bg-purple-500" : "bg-gray-300"
              } relative`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                  backgroundMusic ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Start Generation Button */}
        <Button
          onClick={handleStartGeneration}
          className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-lg mt-6"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Start Video Generation
            <ArrowRight className="w-5 h-5" />
          </span>
        </Button>

        {/* Info Box */}
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>What happens next:</strong>
          </p>
          <ul className="text-xs text-purple-700 mt-2 space-y-1">
            {openingFrame?.enabled && <li>- Opening frame generated with DALL-E 3</li>}
            <li>- Each section converted to video clips</li>
            <li>- Narration generated with AI voice</li>
            {backgroundMusic && <li>- Background music generated with AI</li>}
            {closingFrame?.enabled && <li>- Closing frame generated with DALL-E 3</li>}
            <li>- Final video assembled automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
