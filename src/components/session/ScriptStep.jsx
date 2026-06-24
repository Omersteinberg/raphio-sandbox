import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, Edit3, Check, Send, Clock, ArrowRight, Image, X, Film, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import BridgeSectionCard from "./BridgeSectionCard";

export default function ScriptStep({
  scriptData,
  setScriptData,
  editRequest,
  setEditRequest,
  generateScript,
  editScriptWithAI,
  approveScript,
  approveOutline,
  retryBridgeFrames,
  uploadBridgeImage,
  session,
  loading,
  onNext,
  pipelineMode,
  images = [],
  openingFrame = {},
  closingFrame = {},
  generatedFrameImages,
  phase,
  enableBridges,
}) {
  const isReferencesPipeline = pipelineMode === "references";
  const [editingSection, setEditingSection] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const isGenerated = !!scriptData;
  const isApproved = session?.stage === "SCRIPT_APPROVED" || session?.stage === "FRAMES_CONFIGURED"
    || session?.stage === "REF_SCRIPT_APPROVED" || session?.stage === "REF_FRAMES_GENERATED" || session?.stage === "REF_FRAMES_APPROVED";
  const isOutlineStage = session?.stage === "OUTLINE_GENERATED";
  const hasBridgeFailures = (scriptData?.sections || []).some(
    s => s.source === "bridge" && s.bridgeStatus === "failed"
  );

  console.log("[ScriptStep] render — scriptData:", scriptData);
  console.log("[ScriptStep] render — scriptData?.sections:", scriptData?.sections);
  console.log("[ScriptStep] render — isGenerated:", !!scriptData, "session stage:", session?.stage, "isApproved:", isApproved);

  // Separate opening/closing sections from content sections
  const allSections = scriptData?.sections || [];
  const openingSection = allSections.find((s) => s.sectionType === "OPENING");
  const closingSection = allSections.find((s) => s.sectionType === "CLOSING");
  const contentSections = allSections.filter((s) => s.sectionType !== "OPENING" && s.sectionType !== "CLOSING");
  // Opening/closing frames are OPTIONAL — only show a card when the script actually
  // has that section OR the user explicitly supplied one (upload / custom prompt).
  const hasOpening = !!(openingSection || openingFrame?.useUpload || openingFrame?.customPrompt || generatedFrameImages?.opening?.imageUrl || session?.openingFrameConfig?.uploadedImageUrl);
  const hasClosing = !!(closingSection || closingFrame?.useUpload || closingFrame?.customPrompt || generatedFrameImages?.closing?.imageUrl || session?.closingFrameConfig?.uploadedImageUrl);
  console.log("[ScriptStep] allSections:", allSections.length, "contentSections:", contentSections.length, "sections:", allSections);
  
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
      <div className="flex-1 flex flex-col p-6 border-r border-border overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              {phase === "bridges" ? "Review Bridge Frames" : (scriptData?.title || "Video Script")}
            </h2>
            <p className="text-sm text-ink-muted">
              {phase === "bridges"
                ? `Review generated bridge images • ${(scriptData?.sections || []).filter(s => s.source === "bridge").length} bridge frames`
                : isGenerated ? `${allSections.length} sections • ${totalDuration}s estimated` : "Generate a script from your prompt"}
            </p>
          </div>
          {isGenerated && !isApproved && (
            <div className="flex items-center gap-2">
              {isReferencesPipeline ? (
                <Button
                  onClick={approveScript}
                  disabled={loading}
                  className="text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {loading ? "Approving..." : "Approve Script"}
                </Button>
              ) : phase === "outline" ? (
                <Button
                  onClick={approveOutline}
                  disabled={loading}
                  className="bg-terra hover:bg-terra-dark text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {loading
                    ? (enableBridges ? "Generating Bridge Images..." : "Approving...")
                    : (enableBridges ? "Approve Outline" : "Approve Script")}
                </Button>
              ) : phase === "bridges" ? (
                <Button
                  onClick={approveScript}
                  disabled={loading || hasBridgeFailures}
                  className="text-white"
                  style={{ background: "var(--gradient-brand)" }}
                  title={hasBridgeFailures ? "Fix failed bridge frames first" : ""}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Script
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {!isGenerated ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-6">
              <FileText className="w-16 h-16 text-terra/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink mb-2">
                Ready to Generate Script
              </h3>
              <p className="text-ink-muted max-w-md">
                Based on your prompt and image analysis, we'll create a complete video script with narration and visual descriptions.
              </p>
            </div>
            <Button
              onClick={generateScript}
              disabled={loading}
              className="text-white border-0 px-8 py-6 text-lg"
              style={{ background: "var(--gradient-brand)" }}
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
            {/* Opening Frame - optional; shown only when the script has one (hidden for references pipeline) */}
            {!isReferencesPipeline && hasOpening && (
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
                    {(generatedFrameImages?.opening?.imageUrl || openingFrame.uploadedImage || session?.openingFrameConfig?.uploadedImageUrl) ? (
                      <div className="relative">
                        <img
                          src={generatedFrameImages?.opening?.imageUrl || openingFrame.uploadedImage || session?.openingFrameConfig?.uploadedImageUrl}
                          alt="Opening frame"
                          className="w-32 h-32 object-cover rounded-lg border border-border shadow-sm"
                        />
                        {(generatedFrameImages?.opening?.imageUrl || session?.openingFrameConfig?.uploadedImageUrl) && !openingFrame.uploadedImage && (
                          <span className="absolute -top-2 -right-2 bg-terra text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
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
                          <span className="text-xs text-ink-muted flex items-center gap-1"><Upload className="w-3 h-3" /> Uploaded</span>
                        ) : openingFrame.customPrompt ? (
                          <span className="text-xs text-ink-muted flex items-center gap-1"><Wand2 className="w-3 h-3" /> AI Generated</span>
                        ) : null}
                        {openingSection && (
                          <span className="text-sm text-ink-muted flex items-center gap-1">
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
                          <label className="text-xs text-ink-muted mb-1 block">Narration</label>
                          <Textarea
                            value={openingSection.narrationText || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(openingSection), "narrationText", e.target.value)}
                            className="text-sm"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-ink-muted mb-1 block">Visual Description</label>
                          <Textarea
                            value={openingSection.visualDescription || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(openingSection), "visualDescription", e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-ink-muted mb-1 block">Duration (seconds)</label>
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
                        <p className="text-ink mb-2">{openingSection.narrationText}</p>
                        {openingSection.visualDescription && (
                          <p className="text-sm text-ink-muted italic">
                            Visual: {openingSection.visualDescription}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {openingFrame.description && (
                          <p className="text-sm text-ink/80 mb-1"><span className="font-medium">Context:</span> {openingFrame.description}</p>
                        )}
                        {openingFrame.textOverlay && (
                          <p className="text-sm text-ink-muted"><span className="font-medium">Narration:</span> "{openingFrame.textOverlay}"</p>
                        )}
                        {!openingFrame.description && !openingFrame.textOverlay && (
                          <p className="text-sm text-ink-muted italic">Opening frame — script will include narration & visual direction</p>
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
              if (section.source === "bridge") {
                return (
                  <BridgeSectionCard
                    key={originalIndex}
                    section={section}
                    contentIndex={contentIndex}
                    originalIndex={originalIndex}
                    isApproved={isApproved}
                    isOutlineStage={isOutlineStage}
                    sessionImages={sessionImages}
                    onEdit={handleSectionEdit}
                    onRemove={(idx) => {
                      const newSections = scriptData.sections.filter((_, i) => i !== idx);
                      setScriptData({ ...scriptData, sections: newSections });
                    }}
                    onRetry={retryBridgeFrames}
                    onUploadImage={uploadBridgeImage}
                    loading={loading}
                  />
                );
              }
              const sectionImage = getSectionImage(section);
              return (
                <motion.div
                  key={originalIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: contentIndex * 0.05 }}
                  className={`bg-white rounded-lg border p-4 ${
                    editingSection === originalIndex ? "border-terra" : "border-border"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Image Thumbnail — hidden for references pipeline */}
                    {!isReferencesPipeline && (
                    <div className="flex-shrink-0">
                      {sectionImage ? (
                        <div className="relative group">
                          <img
                            src={sectionImage}
                            alt={`Section ${contentIndex + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-border"
                          />
                          {!isApproved && (
                            <button
                              onClick={() => openImageModal(originalIndex)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                            >
                              <span className="text-white text-xs font-medium">Change</span>
                            </button>
                          )}
                          <span className="absolute -top-2 -right-2 bg-terra text-white text-xs px-1.5 py-0.5 rounded-full">
                            #{section.imageIndex + 1}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => !isApproved && openImageModal(originalIndex)}
                          disabled={isApproved}
                          className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-ink-muted hover:border-terra hover:text-terra transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Image className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add Image</span>
                        </button>
                      )}
                    </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-terra/10 text-terra">
                            {section.sectionType || "CONTENT"}
                          </span>
                          <span className="text-sm text-ink-muted flex items-center gap-1">
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
                            <label className="text-xs text-ink-muted mb-1 block">Narration</label>
                            <Textarea
                              value={section.narrationText || ""}
                              onChange={(e) => handleSectionEdit(originalIndex, "narrationText", e.target.value)}
                              className="text-sm"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-ink-muted mb-1 block">Visual Description</label>
                            <Textarea
                              value={section.visualDescription || ""}
                              onChange={(e) => handleSectionEdit(originalIndex, "visualDescription", e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-ink-muted mb-1 block">Duration (seconds)</label>
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
                          <p className="text-ink mb-2">{section.narrationText}</p>
                          {section.visualDescription && (
                            <p className="text-sm text-ink-muted italic">
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

            {/* Closing Frame - optional; shown only when the script has one (hidden for references pipeline) */}
            {!isReferencesPipeline && hasClosing && (
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
                    {(generatedFrameImages?.closing?.imageUrl || closingFrame.uploadedImage || session?.closingFrameConfig?.uploadedImageUrl) ? (
                      <div className="relative">
                        <img
                          src={generatedFrameImages?.closing?.imageUrl || closingFrame.uploadedImage || session?.closingFrameConfig?.uploadedImageUrl}
                          alt="Closing frame"
                          className="w-32 h-32 object-cover rounded-lg border border-border shadow-sm"
                        />
                        {(generatedFrameImages?.closing?.imageUrl || session?.closingFrameConfig?.uploadedImageUrl) && !closingFrame.uploadedImage && (
                          <span className="absolute -top-2 -right-2 bg-terra text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
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
                          <span className="text-xs text-ink-muted flex items-center gap-1"><Upload className="w-3 h-3" /> Uploaded</span>
                        ) : closingFrame.customPrompt ? (
                          <span className="text-xs text-ink-muted flex items-center gap-1"><Wand2 className="w-3 h-3" /> AI Generated</span>
                        ) : null}
                        {closingSection && (
                          <span className="text-sm text-ink-muted flex items-center gap-1">
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
                          <label className="text-xs text-ink-muted mb-1 block">Narration</label>
                          <Textarea
                            value={closingSection.narrationText || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(closingSection), "narrationText", e.target.value)}
                            className="text-sm"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-ink-muted mb-1 block">Visual Description</label>
                          <Textarea
                            value={closingSection.visualDescription || ""}
                            onChange={(e) => handleSectionEdit(getOriginalIndex(closingSection), "visualDescription", e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-ink-muted mb-1 block">Duration (seconds)</label>
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
                        <p className="text-ink mb-2">{closingSection.narrationText}</p>
                        {closingSection.visualDescription && (
                          <p className="text-sm text-ink-muted italic">
                            Visual: {closingSection.visualDescription}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {closingFrame.description && (
                          <p className="text-sm text-ink/80 mb-1"><span className="font-medium">Context:</span> {closingFrame.description}</p>
                        )}
                        {closingFrame.textOverlay && (
                          <p className="text-sm text-ink-muted mb-1"><span className="font-medium">Narration:</span> "{closingFrame.textOverlay}"</p>
                        )}
                        {!closingFrame.description && !closingFrame.textOverlay && (
                          <p className="text-sm text-ink-muted italic">Closing frame — script will include narration & visual direction</p>
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
              className="w-full text-white border-0"
              style={{ background: "var(--gradient-brand)" }}
            >
              <span className="flex items-center gap-2">
                Continue to Generation Settings
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Right Side - AI Edit or Bridge Status */}
      <div className="w-full lg:w-80 flex flex-col bg-surface-alt p-6">
        {phase === "bridges" ? (
          <>
            <h3 className="font-semibold text-ink mb-4">Bridge Frame Status</h3>
            {(() => {
              const bridges = (scriptData?.sections || []).filter(s => s.source === "bridge");
              const completed = bridges.filter(s => s.bridgeStatus === "completed").length;
              const failed = bridges.filter(s => s.bridgeStatus === "failed").length;
              const pending = bridges.filter(s => s.bridgeStatus === "pending").length;
              return (
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-sm font-medium text-ink/80 mb-2">Progress</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Completed</span>
                        <span className="font-medium">{completed}/{bridges.length}</span>
                      </div>
                      {failed > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600">Failed</span>
                          <span className="font-medium">{failed}</span>
                        </div>
                      )}
                      {pending > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-yellow-600">Pending</span>
                          <span className="font-medium">{pending}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {failed > 0 && (
                    <Button
                      onClick={() => retryBridgeFrames && retryBridgeFrames()}
                      disabled={loading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Retry All Failed ({failed})
                    </Button>
                  )}
                  <div className="p-3 bg-terra/10 rounded-lg border border-terra/30">
                    <p className="text-xs text-terra">
                      <strong>Tip:</strong> You can retry individual bridge frames, or upload your own image as a replacement.
                    </p>
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <>
            <h3 className="font-semibold text-ink mb-4">AI Script Editor</h3>

            {!isGenerated ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted">
                <Sparkles className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm text-center">
                  Generate a script first to use the AI editor
                </p>
              </div>
            ) : isApproved ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted">
                <Check className="w-12 h-12 mb-3 text-green-500" />
                <p className="text-sm text-center">
                  Script approved! Proceed to generation settings.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink-muted mb-4">
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
                  className="mt-4 text-white border-0"
                  style={{ background: "var(--gradient-brand)" }}
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

                <div className="mt-6 p-3 bg-terra/10 rounded-lg border border-terra/30">
                  <p className="text-xs text-terra">
                    <strong>Tip:</strong> You can also click the edit icon on any section to make direct changes.
                  </p>
                </div>
              </>
            )}
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
                <h3 className="text-lg font-semibold text-ink">Select Image for Section</h3>
                <button
                  onClick={() => setImageModalOpen(false)}
                  className="text-ink-muted hover:text-ink-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-ink-muted mb-4">
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
                            ? "border-terra ring-2 ring-terra/30"
                            : "border-border hover:border-terra/40"
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
                          <div className="absolute inset-0 bg-terra/20 flex items-center justify-center">
                            <Check className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {sessionImages.length === 0 && (
                  <div className="text-center py-8 text-ink-muted">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No images available</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex justify-end gap-3">
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
