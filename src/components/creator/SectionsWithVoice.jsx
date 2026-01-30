import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Trash2,
  Plus,
  Video,
  Image as ImageIcon,
  Check,
  Mic2,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function SectionsWithVoice({
  // Section props
  sections,
  updateSection,
  addSection,
  removeSection,
  getTotalDuration,
  // Image pool
  uploadedImages,
  // Voice props
  voices,
  filteredVoices,
  selectedVoice,
  setSelectedVoice,
  voiceFilter,
  setVoiceFilter,
  voiceLoading,
}) {
  const [expandedSection, setExpandedSection] = useState(0);
  const totalDuration = getTotalDuration();

  const voiceFilters = [
    { key: "all", label: "All" },
    { key: "male", label: "Male" },
    { key: "female", label: "Female" },
  ];

  const handleImageSelect = (sectionIndex, image) => {
    updateSection(sectionIndex, {
      imageFile: image.file,
      imagePreview: image.preview,
      selectedImageId: image.id,
    });
  };

  return (
    <div className="w-full h-full flex">
      {/* Left Side - Sections */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Video Sections
              </h2>
              <p className="text-sm text-gray-600">
                {sections.length} sections · {totalDuration}s total
              </p>
            </div>
            <Button
              onClick={() => addSection(sections.length - 1)}
              variant="outline"
              size="sm"
              className="border-purple-400 text-purple-700 hover:bg-purple-50 font-medium"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Section
            </Button>
          </div>
        </div>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.orderIndex ?? index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Section Header */}
              <div
                onClick={() =>
                  setExpandedSection(expandedSection === index ? -1 : index)
                }
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {section.imagePreview ? (
                      <img
                        src={section.imagePreview}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Section {index + 1}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{section.duration || 5}s</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sections.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSection(index);
                      }}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {expandedSection === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedSection === index && (
                <div className="p-4 pt-0 space-y-4 border-t border-gray-100">
                  {/* Image Selection */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-2 block">
                      Select Image
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {uploadedImages.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => handleImageSelect(index, img)}
                          className={`
                            relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer flex-shrink-0 border-2 transition-all
                            ${
                              section.selectedImageId === img.id
                                ? "border-purple-500 ring-2 ring-purple-200"
                                : "border-transparent hover:border-gray-300"
                            }
                          `}
                        >
                          <img
                            src={img.preview}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {section.selectedImageId === img.id && (
                            <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                      {uploadedImages.length === 0 && (
                        <p className="text-sm text-gray-500 py-4">
                          No images uploaded. Go back to upload images.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Narration Text */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-2 block">
                      Narration Text
                    </label>
                    <Textarea
                      value={section.narrationText || ""}
                      onChange={(e) =>
                        updateSection(index, { narrationText: e.target.value })
                      }
                      placeholder="What should be spoken during this section..."
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 min-h-[80px] focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  {/* Motion Prompt */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-600" />
                      Motion Prompt
                    </label>
                    <Textarea
                      value={section.motionPrompt || ""}
                      onChange={(e) =>
                        updateSection(index, { motionPrompt: e.target.value })
                      }
                      placeholder="e.g., Slow pan left to right, gentle zoom in..."
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 min-h-[60px] focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-2 block">
                      Duration: {section.duration || 5} seconds
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      value={section.duration || 5}
                      onChange={(e) =>
                        updateSection(index, {
                          duration: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-purple-600"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right Side - Voice Selection */}
      <div className="w-72 lg:w-80 flex flex-col border-l border-gray-100 bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <h3 className="font-semibold text-gray-900 mb-3">Select Voice</h3>
          {/* Filters */}
          <div className="flex gap-2">
            {voiceFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setVoiceFilter(f.key)}
                className={`
                  px-3 py-1.5 text-sm rounded-full transition-colors font-medium
                  ${
                    voiceFilter === f.key
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {voiceLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            filteredVoices.map((voice) => {
              const isSelected = selectedVoice === voice.key;
              return (
                <motion.div
                  key={voice.key}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedVoice(voice.key)}
                  className={`
                    p-3 rounded-xl cursor-pointer transition-all
                    ${
                      isSelected
                        ? "bg-purple-100 border-2 border-purple-500"
                        : "bg-white border border-gray-200 hover:border-purple-400 hover:shadow-sm"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${
                          voice.gender === "female"
                            ? "bg-pink-100 text-pink-600"
                            : "bg-blue-100 text-blue-600"
                        }
                      `}
                    >
                      {voice.gender === "female" ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Mic2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{voice.name}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {voice.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Selected Voice Info */}
        {selectedVoice && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Selected:</span>{" "}
              {voices.find((v) => v.key === selectedVoice)?.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
