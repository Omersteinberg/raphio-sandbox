import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, Edit3, Check, Send, Clock, ArrowRight, Image, X, Film, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function ScriptStep({
  scriptData,
  setScriptData,
  editRequest,
  setEditRequest,
  generateScript,
  editScriptWithAI,
  approveScript,
  session,
  loading,
  onNext,
  images = [],
  openingFrame,
  closingFrame,
  generatedFrameImages,
}) {
  const [editingSection, setEditingSection] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const isGenerated = !!scriptData;
  const isApproved = session?.stage === "SCRIPT_APPROVED" || session?.stage === "FRAMES_CONFIGURED";

  // Separate opening/closing sections from content sections
  const allSections = scriptData?.sections || [];
  const openingSection = allSections.find((s) => s.sectionType === "OPENING");
  const closingSection = allSections.find((s) => s.sectionType === "CLOSING");
  const contentSections = allSections.filter((s) => s.sectionType !== "OPENING" && s.sectionType !== "CLOSING");
  
  // Get the real indices in the original array for editing
  const getOriginalIndex = (section) => allSections.indexOf(section);

  // Get session images - prioritize server-side images (with imageUrl) over local previews
  // Server images maintain the correct order that imageIndex references
  const serverImages = session?.images || [];
  const sessionImages = serverImages.length > 0 ? serverImages : images;

  const handleSectionEdit = (index, field, value) => {
    const newSections = [...(scriptData.sections || [])];
    newSections[index] = { ...newSections[index], [field]: value };
    setScriptData({ ...scriptData, sections: newSections });
  };

  const totalDuration = allSections.reduce(
    (sum, s) => sum + (s.suggestedDuration || 5),
    0
  ) || 0;

  // Get the image for a section - use imageId for precise matching, fall back to imageIndex
  const getSectionImage = (section) => {
    // First try matching by imageId (most reliable)
    if (section.imageId) {
      const img = sessionImages.find((i) => i.id === section.imageId);
      if (img) return img.imageUrl || img.preview || null;
    }
    // Fall back to imageIndex
    if (section.imageIndex !== null && section.imageIndex !== undefined) {
      const img = sessionImages[section.imageIndex];
      return img?.imageUrl || img?.preview || null;
    }
    return null;
  };

  // Open image selection modal
  const openImageModal = (sectionIndex) => {
    setSelectedSectionIndex(sectionIndex);
    setImageModalOpen(true);
  };

  // Handle image selection from modal
  const handleImageSelect = (imageIndex) => {
    if (selectedSectionIndex !== null) {
      handleSectionEdit(selectedSectionIndex, "imageIndex", imageIndex);
    }
    setImageModalOpen(false);
    setSelectedSectionIndex(null);
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      {/* Left Side - Script Sections */}
      <div className="flex-1 flex flex-col p-6 border-r border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {scriptData?.title || "Video Script"}
            </h2>
            <p className="text-sm text-gray-600">
              {isGenerated ? `${allSections.length} sections • ${totalDuration}s estimated` : "Generate a script from your prompt"}
            </p>
          </div>
          {isGenerated && !isApproved && (
            <Button
              onClick={approveScript}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Approve Script
            </Button>
          )}
        </div>

        {!isGenerated ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-6">
              <FileText className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ready to Generate Script
              </h3>
              <p className="text-gray-600 max-w-md">
                Based on your prompt and image analysis, we'll create a complete video script with narration and visual descriptions.
              </p>
            </div>
            <Button
              onClick={generateScript}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Generating Script...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Script
                </span>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Opening Frame - shown above content sections */}
            {openingFrame?.enabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-lg border p-4 ${
                  editingSection === "opening" ? "border-green-500" : "border-green-300"
                }`}
              >
                <div className="flex gap-4">
                  {/* Frame Image */}
                  <div className="flex-shrink-0">
                    {(generatedFrameImages?.opening?.imageUrl || openingFrame.uploadedImage) ? (
                      <div className="relative">
                        <img
                          src={generatedFrameImages?.opening?.imageUrl || openingFrame.uploadedImage}
                          alt="Opening frame"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        {generatedFrameImages?.opening?.imageUrl && !openingFrame.uploadedImage && (
                          <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-green-50 flex flex-col items-center justify-center text-green-400">
                        <Film className="w-6 h-6 mb-1" />
                        <span className="text-xs">Frame</span>
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">OPENING</span>
                        {openingFrame.useUpload ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Upload className="w-3 h-3" /> Uploaded</span>
                        ) : openingFrame.customPrompt ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Wand2 className="w-3 h-3" /> AI Generated</span>
                        ) : null}
                        {openingSection && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {openingSection.suggestedDuration || 5}s
                          </span>
                        )}
                      </div>
                      {!isApproved && openingSection && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSection(editingSection === "opening" ? null : "opening")}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {editingSection === "opening" && openingSection ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Narration</label>
                          <Textarea
                            value={openingSection.narrationText || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(openingSection), "narrationText", e.target.value)}
                            className="text-sm"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Visual Description</label>
                          <Textarea
                            value={openingSection.visualDescription || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(openingSection), "visualDescription", e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Duration (seconds)</label>
                          <Input
                            type="number"
                            value={openingSection.suggestedDuration || 5}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(openingSection), "suggestedDuration", parseInt(e.target.value) || 5)}
                            className="w-24 text-sm"
                            min={1}
                            max={30}
                          />
                        </div>
                      </div>
                    ) : openingSection ? (
                      <>
                        <p className="text-gray-900 mb-2">{openingSection.narrationText}</p>
                        {openingSection.visualDescription && (
                          <p className="text-sm text-gray-500 italic">
                            Visual: {openingSection.visualDescription}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {openingFrame.description && (
                          <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Context:</span> {openingFrame.description}</p>
                        )}
                        {openingFrame.textOverlay && (
                          <p className="text-sm text-gray-600"><span className="font-medium">Narration:</span> "{openingFrame.textOverlay}"</p>
                        )}
                        {!openingFrame.description && !openingFrame.textOverlay && (
                          <p className="text-sm text-gray-400 italic">Opening frame enabled — script will include narration & visual direction</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Content Sections */}
            {contentSections.map((section, contentIndex) => {
              const originalIndex = getOriginalIndex(section);
              const sectionImage = getSectionImage(section);
              return (
                <motion.div
                  key={originalIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: contentIndex * 0.05 }}
                  className={`bg-white rounded-lg border p-4 ${
                    editingSection === originalIndex ? "border-purple-500" : "border-gray-200"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Image Thumbnail */}
                    <div className="flex-shrink-0">
                      {sectionImage ? (
                        <div className="relative group">
                          <img
                            src={sectionImage}
                            alt={`Section ${contentIndex + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                          />
                          {!isApproved && (
                            <button
                              onClick={() => openImageModal(originalIndex)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                            >
                              <span className="text-white text-xs font-medium">Change</span>
                            </button>
                          )}
                          <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                            #{section.imageIndex + 1}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => !isApproved && openImageModal(originalIndex)}
                          disabled={isApproved}
                          className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Image className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add Image</span>
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {section.sectionType || "CONTENT"}
                          </span>
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {section.suggestedDuration || 5}s
                          </span>
                        </div>
                        {!isApproved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSection(editingSection === originalIndex ? null : originalIndex)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {editingSection === originalIndex ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Narration</label>
                            <Textarea
                              value={section.narrationText || ""}
                              onChange={(e) => handleSectionEdit(originalIndex, "narrationText", e.target.value)}
                              className="text-sm"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Visual Description</label>
                            <Textarea
                              value={section.visualDescription || ""}
                              onChange={(e) => handleSectionEdit(originalIndex, "visualDescription", e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Duration (seconds)</label>
                            <Input
                              type="number"
                              value={section.suggestedDuration || 5}
                              onChange={(e) => handleSectionEdit(originalIndex, "suggestedDuration", parseInt(e.target.value) || 5)}
                              className="w-24 text-sm"
                              min={1}
                              max={30}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-900 mb-2">{section.narrationText}</p>
                          {section.visualDescription && (
                            <p className="text-sm text-gray-500 italic">
                              Visual: {section.visualDescription}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Frame Configuration Section removed - now in PromptStep */}

            {/* Closing Frame - shown below content sections */}
            {closingFrame?.enabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (contentSections.length) * 0.05 }}
                className={`bg-white rounded-lg border p-4 ${
                  editingSection === "closing" ? "border-orange-500" : "border-orange-300"
                }`}
              >
                <div className="flex gap-4">
                  {/* Frame Image */}
                  <div className="flex-shrink-0">
                    {(generatedFrameImages?.closing?.imageUrl || closingFrame.uploadedImage) ? (
                      <div className="relative">
                        <img
                          src={generatedFrameImages?.closing?.imageUrl || closingFrame.uploadedImage}
                          alt="Closing frame"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        {generatedFrameImages?.closing?.imageUrl && !closingFrame.uploadedImage && (
                          <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-orange-50 flex flex-col items-center justify-center text-orange-400">
                        <Film className="w-6 h-6 mb-1" />
                        <span className="text-xs">Frame</span>
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">CLOSING</span>
                        {closingFrame.useUpload ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Upload className="w-3 h-3" /> Uploaded</span>
                        ) : closingFrame.customPrompt ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Wand2 className="w-3 h-3" /> AI Generated</span>
                        ) : null}
                        {closingSection && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {closingSection.suggestedDuration || 5}s
                          </span>
                        )}
                      </div>
                      {!isApproved && closingSection && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSection(editingSection === "closing" ? null : "closing")}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {editingSection === "closing" && closingSection ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Narration</label>
                          <Textarea
                            value={closingSection.narrationText || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(closingSection), "narrationText", e.target.value)}
                            className="text-sm"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Visual Description</label>
                          <Textarea
                            value={closingSection.visualDescription || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(closingSection), "visualDescription", e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Duration (seconds)</label>
                          <Input
                            type="number"
                            value={closingSection.suggestedDuration || 5}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(closingSection), "suggestedDuration", parseInt(e.target.value) || 5)}
                            className="w-24 text-sm"
                            min={1}
                            max={30}
                          />
                        </div>
                      </div>
                    ) : closingSection ? (
                      <>
                        <p className="text-gray-900 mb-2">{closingSection.narrationText}</p>
                        {closingSection.visualDescription && (
                          <p className="text-sm text-gray-500 italic">
                            Visual: {closingSection.visualDescription}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {closingFrame.description && (
                          <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Context:</span> {closingFrame.description}</p>
                        )}
                        {closingFrame.textOverlay && (
                          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Narration:</span> "{closingFrame.textOverlay}"</p>
                        )}
                        {closingFrame.callToAction && (
                          <p className="text-sm text-gray-600"><span className="font-medium">CTA:</span> {closingFrame.callToAction}</p>
                        )}
                        {!closingFrame.description && !closingFrame.textOverlay && (
                          <p className="text-sm text-gray-400 italic">Closing frame enabled — script will include narration & visual direction</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {isApproved && (
          <div className="mt-4">
            <Button
              onClick={onNext}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <span className="flex items-center gap-2">
                Continue to Generation Settings
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Right Side - AI Edit */}
      <div className="w-full lg:w-80 flex flex-col bg-gray-50 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">AI Script Editor</h3>

        {!isGenerated ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Sparkles className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm text-center">
              Generate a script first to use the AI editor
            </p>
          </div>
        ) : isApproved ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Check className="w-12 h-12 mb-3 text-green-500" />
            <p className="text-sm text-center">
              Script approved! Proceed to generation settings.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Describe changes you want to make and AI will update the script.
            </p>

            <Textarea
              value={editRequest}
              onChange={(e) => setEditRequest(e.target.value)}
              placeholder="e.g., Make the opening more dramatic, shorten section 3, add more emotion to the closing..."
              className="flex-1 min-h-[120px] bg-white"
            />

            <Button
              onClick={editScriptWithAI}
              disabled={!editRequest.trim() || loading}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Updating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Apply Changes
                </span>
              )}
            </Button>

            <div className="mt-6 p-3 bg-purple-100 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-800">
                <strong>Tip:</strong> You can also click the edit icon on any section to make direct changes.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Image Selection Modal */}
      <AnimatePresence>
        {imageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setImageModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select Image for Section</h3>
                <button
                  onClick={() => setImageModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Choose which image to use for this section of your video.
              </p>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {sessionImages.map((img, imgIndex) => {
                    const imageUrl = img.imageUrl || img.preview;
                    const isSelected = scriptData?.sections?.[selectedSectionIndex]?.imageIndex === imgIndex;
                    return (
                      <button
                        key={imgIndex}
                        onClick={() => handleImageSelect(imgIndex)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? "border-purple-500 ring-2 ring-purple-200"
                            : "border-gray-200 hover:border-purple-300"
                        }`}
                      >
                        <img
                          src={imageUrl}
                          alt={img.originalName || `Image ${imgIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          #{imgIndex + 1}
                        </div>
                        {isSelected && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <Check className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {sessionImages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No images available</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setImageModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleImageSelect(null)}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Remove Image
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
