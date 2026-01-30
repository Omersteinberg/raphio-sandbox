import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  Sparkles,
  Check,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const aiProviders = [
  {
    id: "runway",
    name: "Runway",
    description: "High quality, cinematic motion",
    badge: "Recommended",
  },
  {
    id: "pika",
    name: "Pika",
    description: "Fast generation, stylized output",
    badge: null,
  },
  {
    id: "kling",
    name: "Kling",
    description: "Realistic motion, longer clips",
    badge: null,
  },
];

export default function PreviewStep({
  sections,
  selectedVoice,
  voices,
  selectedAI,
  setSelectedAI,
  onGenerate,
  loading,
}) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const totalDuration = sections.reduce(
    (sum, s) => sum + (s.duration || 5),
    0
  );

  const currentSectionData = sections[currentSection];

  const handlePrevSection = () => {
    setCurrentSection((prev) => Math.max(0, prev - 1));
  };

  const handleNextSection = () => {
    setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1));
  };

  const selectedVoiceData = voices?.find((v) => v.key === selectedVoice);

  return (
    <div className="w-full h-full flex">
      {/* Left Side - Preview Player */}
      <div className="flex-1 flex flex-col p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Preview Your Video
        </h2>

        {/* Video Preview Area */}
        <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative">
          {/* Preview Image */}
          {currentSectionData?.imagePreview ? (
            <img
              src={currentSectionData.imagePreview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-600" />
            </div>
          )}

          {/* Overlay Controls */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="lg"
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 text-white"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
          </div>

          {/* Section Indicator */}
          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            Section {currentSection + 1} / {sections.length}
          </div>

          {/* Narration Text Overlay */}
          {currentSectionData?.narrationText && (
            <div className="absolute bottom-16 left-4 right-4 bg-black/70 text-white p-3 rounded-lg text-sm">
              {currentSectionData.narrationText}
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevSection}
            disabled={currentSection === 0}
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSection}
            disabled={currentSection === sections.length - 1}
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-600 ml-4">
            <Clock className="w-4 h-4" />
            <span>{totalDuration}s total</span>
          </div>
        </div>

        {/* Section Timeline */}
        <div className="mt-4 flex gap-1 overflow-x-auto pb-2">
          {sections.map((section, index) => (
            <div
              key={index}
              onClick={() => setCurrentSection(index)}
              className={`
                flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden cursor-pointer transition-all
                ${
                  currentSection === index
                    ? "ring-2 ring-purple-500"
                    : "opacity-60 hover:opacity-100"
                }
              `}
            >
              {section.imagePreview ? (
                <img
                  src={section.imagePreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - AI Selection & Summary */}
      <div className="w-80 lg:w-96 flex flex-col border-l border-gray-100 bg-gray-50">
        {/* Summary */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <h3 className="font-semibold text-gray-900 mb-3">Video Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sections</span>
              <span className="text-gray-900 font-medium">
                {sections.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Duration</span>
              <span className="text-gray-900 font-medium">{totalDuration}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Voice</span>
              <span className="text-gray-900 font-medium">
                {selectedVoiceData?.name || "Not selected"}
              </span>
            </div>
          </div>
        </div>

        {/* AI Provider Selection */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Choose AI Provider
          </h3>
          <div className="space-y-2">
            {aiProviders.map((provider) => {
              const isSelected = selectedAI === provider.id;
              return (
                <motion.div
                  key={provider.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedAI(provider.id)}
                  className={`
                    p-3 rounded-xl cursor-pointer transition-all
                    ${
                      isSelected
                        ? "bg-purple-100 border-2 border-purple-500"
                        : "bg-white border border-gray-200 hover:border-purple-400 hover:shadow-sm"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {provider.name}
                        </p>
                        {provider.badge && (
                          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">
                            {provider.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {provider.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Generate Button */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <Button
            onClick={onGenerate}
            disabled={loading || !selectedAI}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-medium"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Starting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Video
              </div>
            )}
          </Button>
          <p className="text-xs text-gray-600 text-center mt-2">
            This will start the video generation process
          </p>
        </div>
      </div>
    </div>
  );
}
