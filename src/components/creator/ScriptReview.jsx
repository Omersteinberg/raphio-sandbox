import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Trash2,
  Plus,
  GripVertical,
  Image,
  AlertCircle,
  RefreshCw,
  Upload,
  X,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ScriptReview({
  script,
  sections,
  updateSection,
  addSection,
  removeSection,
  getTotalDuration,
  getImagesCount,
  targetDuration = 60,
  onRegenerate,
}) {
  const [expandedSection, setExpandedSection] = useState(null);
  const fileInputRefs = useRef({});
  const totalDuration = getTotalDuration();
  const durationDiff = totalDuration - targetDuration;

  const handleImageUpload = (index, event) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      updateSection(index, {
        imageFile: file,
        imagePreview: previewUrl
      });
    }
  };

  const handleRemoveImage = (index) => {
    updateSection(index, {
      imageFile: null,
      imagePreview: null
    });
  };

  const triggerFileInput = (index) => {
    fileInputRefs.current[index]?.click();
  };

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hidden">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Script Sections */}
          <div className="lg:col-span-2 space-y-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                Review Your Script
              </h1>
              <p className="text-gray-400">
                Edit the AI-generated script. Each section represents a scene in
                your video.
              </p>
            </div>

          {sections.map((section, index) => (
            <motion.div
              key={section.orderIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                  <span className="text-white font-medium">
                    Section {index + 1}
                  </span>
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Clock className="w-3 h-3" />
                    <span>{section.duration || 5}s</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSection(index)}
                  disabled={sections.length <= 1}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Section Content */}
              <div className="p-4 space-y-4">
                {/* Narration Text */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Narration Text
                  </label>
                  <Textarea
                    value={section.narrationText || ""}
                    onChange={(e) =>
                      updateSection(index, { narrationText: e.target.value })
                    }
                    placeholder="What should be narrated in this section..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[80px] resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {section.narrationText?.length || 0} characters
                    </span>
                    {(section.narrationText?.length || 0) > 200 && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Text may be too long for {section.duration || 5}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Image className="w-4 h-4 text-purple-400" />
                    Section Image
                  </label>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current[index] = el)}
                    onChange={(e) => handleImageUpload(index, e)}
                    accept="image/*"
                    className="hidden"
                  />
                  {section.imagePreview ? (
                    <div className="relative group">
                      <img
                        src={section.imagePreview}
                        alt={`Section ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg border border-white/10"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => triggerFileInput(index)}
                          className="text-white hover:bg-white/20"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Replace
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveImage(index)}
                          className="text-red-400 hover:bg-red-400/20"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => triggerFileInput(index)}
                      className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">
                        Click to upload image
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        JPG, PNG, WebP (max 10MB)
                      </p>
                    </div>
                  )}
                  {section.visualDescription && (
                    <p className="text-purple-300 text-xs mt-2 italic">
                      Suggested: {section.visualDescription}
                    </p>
                  )}
                </div>

                {/* Motion Prompt */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-400" />
                    Motion Prompt
                  </label>
                  <Textarea
                    value={section.motionPrompt || ""}
                    onChange={(e) =>
                      updateSection(index, { motionPrompt: e.target.value })
                    }
                    placeholder="e.g., Slow pan from left to right, gentle zoom in, subtle movement..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[60px] resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Describe how the AI should animate this image
                  </p>
                </div>

                {/* Duration Slider */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Duration: {section.duration || 5} seconds
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={section.duration || 5}
                    onChange={(e) =>
                      updateSection(index, { duration: parseInt(e.target.value) })
                    }
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              {/* Add Section Button */}
              <div className="px-4 pb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addSection(index)}
                  className="w-full border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-purple-500 hover:bg-purple-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section Below
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right Column - Summary Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 bg-white/5 rounded-xl border border-white/10 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Summary</h2>

            {/* Duration Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Duration</span>
                <span
                  className={`font-medium ${
                    Math.abs(durationDiff) > 10
                      ? "text-amber-400"
                      : "text-white"
                  }`}
                >
                  {totalDuration}s
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Target Duration</span>
                <span className="text-white">{targetDuration}s</span>
              </div>
              {durationDiff !== 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Difference</span>
                  <span
                    className={
                      durationDiff > 0 ? "text-amber-400" : "text-blue-400"
                    }
                  >
                    {durationDiff > 0 ? "+" : ""}
                    {durationDiff}s
                  </span>
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            {/* Section Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Sections</span>
                <span className="text-white">{sections.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Images</span>
                <span className={`${getImagesCount?.() === sections.length ? "text-green-400" : "text-amber-400"}`}>
                  {getImagesCount?.() || 0} / {sections.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg. Duration</span>
                <span className="text-white">
                  {sections.length > 0
                    ? Math.round(totalDuration / sections.length)
                    : 0}
                  s
                </span>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* Tips */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white">Tips</h3>
              <ul className="text-xs text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Upload an image for each section
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Add motion prompts like "slow zoom in" or "pan left to right"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  Keep narration natural and conversational
                </li>
              </ul>
            </div>

            <div className="h-px bg-white/10" />

            {/* Regenerate Button */}
            {onRegenerate && (
              <Button
                variant="outline"
                onClick={onRegenerate}
                className="w-full border-white/20 text-gray-300 hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Over with New Script
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
