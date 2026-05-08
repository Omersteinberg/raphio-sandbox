import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Palette, Upload, X, Image as ImageIcon, Film, Wand2, ChevronDown, ChevronUp, GripVertical, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { STYLE_OPTIONS } from '../../constants/styles';
import CharacterCard from './CharacterCard';
import { MAX_IMAGES } from "@/lib/limits";

const STYLE_ICONS = {
  realistic: "\uD83D\uDCF7",
  animated: "\uD83C\uDFA8",
  cinematic: "\uD83C\uDFAC",
  surreal: "\u2728",
};

export default function PromptStep({
  userPrompt,
  setUserPrompt,
  style,
  setStyle,
  images,
  addImages,
  removeImage,
  reorderImages,
  onStart,
  loading,
  openingFrame,
  setOpeningFrame,
  closingFrame,
  setClosingFrame,
  styleOptions = [],
  // Character pipeline props
  pipelineMode,
  onModeChange,
  character,
  onCharacterChange,
  error,
}) {
  const isCharacterMode = pipelineMode === 'character';
  const fileInputRef = useRef(null);
  const openingFileRef = useRef(null);
  const closingFileRef = useRef(null);
  const [frameConfigExpanded, setFrameConfigExpanded] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [showImageOrderGuide, setShowImageOrderGuide] = useState(false);
  const atCap = (images?.length ?? 0) >= MAX_IMAGES;

  // Handle file upload for frames
  const handleFrameFileChange = (e, frameType) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const setter = frameType === "opening" ? setOpeningFrame : setClosingFrame;
        setter((prev) => ({
          ...prev,
          uploadedImage: event.target.result,
          uploadedFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // Remove uploaded frame image
  const removeFrameImage = (frameType) => {
    const setter = frameType === "opening" ? setOpeningFrame : setClosingFrame;
    setter((prev) => ({
      ...prev,
      uploadedImage: null,
      uploadedFile: null,
    }));
  };

  console.log("[PromptStep] Rendering with:", {
    userPrompt: userPrompt?.substring(0, 50),
    style,
    imagesCount: images?.length || 0,
    loading,
  });

  const handleFileChange = (e) => {
    console.log("[PromptStep] File input changed");
    const files = Array.from(e.target.files || []);
    console.log("[PromptStep] Selected files:", files.length);
    if (files.length > 0) {
      addImages(files);
    }
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    console.log("[PromptStep] Files dropped");
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "image/jpeg" || f.type === "image/png"
    );
    console.log("[PromptStep] Valid image files:", files.length);
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleStart = () => {
    console.log("[PromptStep] Start button clicked");
    console.log("[PromptStep] Current state:", {
      userPrompt,
      style,
      imagesCount: images?.length || 0,
      openingFrame: { useUpload: openingFrame?.useUpload, customPrompt: openingFrame?.customPrompt },
      closingFrame: { useUpload: closingFrame?.useUpload, customPrompt: closingFrame?.customPrompt },
    });
    onStart();
  };

  // Frames are mandatory but auto-figure-out is allowed when the user
  // provides neither a prompt nor an upload — so no per-frame prompt requirement.
  const canStart = isCharacterMode
    ? character?.name?.trim() && character?.description?.trim() && userPrompt?.trim() && style && (character?.useUpload === false || character?.referenceFile)
    : userPrompt?.trim() && images?.length > 0;

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-start p-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-sm"
              style={{ background: "linear-gradient(135deg, #FFF0E6, #F0EAFF)" }}
            >
              <Sparkles className="w-8 h-8" style={{ color: "#F97066" }} />
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#2D2235" }}>
              {isCharacterMode ? "Create a Character Video" : "Create Your Video"}
            </h1>
            <p style={{ color: "#6B5E7B" }}>
              {isCharacterMode
                ? "Upload a character and tell us the story you want"
                : "Tell us what your video should be about and add your pictures"}
            </p>
          </div>

          {/* Pipeline Mode Toggle */}
          {onModeChange && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => onModeChange('image')}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                style={
                  !isCharacterMode
                    ? { background: "linear-gradient(135deg, #F97066, #FB923C)", color: "#fff", boxShadow: "0 4px 12px rgba(249,112,102,0.25)" }
                    : { background: "#F0EAFF", color: "#6B5E7B" }
                }
              >
                Image-Based
              </button>
              <button
                onClick={() => onModeChange('character')}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                style={
                  isCharacterMode
                    ? { background: "linear-gradient(135deg, #F97066, #FB923C)", color: "#fff", boxShadow: "0 4px 12px rgba(249,112,102,0.25)" }
                    : { background: "#F0EAFF", color: "#6B5E7B" }
                }
              >
                Character Story
              </button>
            </div>
          )}

          {/* Prompt Input */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold" style={{ color: "#2D2235" }}>
                What's your video about?
              </label>
              <button
                onClick={() => setShowPromptGuide(true)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:scale-105"
                style={{ background: "#FFF0E6", color: "#F97066" }}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Tips
              </button>
            </div>
            <Textarea
              value={userPrompt}
              onChange={(e) => {
                console.log("[PromptStep] Prompt changed:", e.target.value.substring(0, 30));
                setUserPrompt(e.target.value);
              }}
              placeholder="e.g., A promotional video for my coffee shop showing our cozy atmosphere, specialty drinks, and friendly baristas..."
              className="w-full min-h-[120px] rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200 resize-none"
              style={{ background: "rgba(255,255,255,0.8)" }}
            />
          </div>

          {/* Character Card (character mode only) */}
          {isCharacterMode && (
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3" style={{ color: "#2D2235" }}>
                Your Character
              </label>
              <CharacterCard
                character={character}
                onChange={onCharacterChange}
                disabled={loading}
              />
            </div>
          )}

          {/* Image Upload Section (image mode only) */}
          {!isCharacterMode && <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold" style={{ color: "#2D2235" }}>
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Your Pictures ({images?.length || 0})
              </label>
              <button
                type="button"
                onClick={() => setShowImageOrderGuide(true)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:scale-105"
                style={{ background: "#FFF0E6", color: "#F97066" }}
                title="Image order tip"
                aria-label="Show image order tip"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Tips
              </button>
            </div>

            <div className="text-xs mb-3" style={{ color: "#9B8FA8" }}>
              Drag and drop to reorder before starting.
            </div>

            {/* Drop Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              disabled={atCap}
            />
            <div
              onClick={() => {
                if (atCap) return;
                console.log("[PromptStep] Drop zone clicked, opening file picker");
                fileInputRef.current?.click();
              }}
              onDrop={(e) => {
                if (atCap) {
                  e.preventDefault();
                  return;
                }
                handleDrop(e);
              }}
              onDragOver={handleDragOver}
              title={atCap ? `Maximum ${MAX_IMAGES} images per video` : undefined}
              aria-disabled={atCap}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all mb-2 ${atCap ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-[1.01]"}`}
              style={{ borderColor: "#E0D7FC", background: "rgba(240,234,255,0.3)" }}
              onMouseEnter={(e) => { if (atCap) return; e.currentTarget.style.borderColor = "#F97066"; e.currentTarget.style.background = "rgba(249,112,102,0.04)"; }}
              onMouseLeave={(e) => { if (atCap) return; e.currentTarget.style.borderColor = "#E0D7FC"; e.currentTarget.style.background = "rgba(240,234,255,0.3)"; }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "#F97066" }} />
              <p className="font-semibold" style={{ color: "#2D2235" }}>
                {atCap ? `Maximum ${MAX_IMAGES} images per video` : "Drop pictures here or tap to upload"}
              </p>
              <p className="text-sm mt-1" style={{ color: "#9B8FA8" }}>
                JPEG and PNG files
              </p>
            </div>

            <p className="text-xs mb-4" style={{ color: "#9B8FA8" }}>
              Up to {MAX_IMAGES} images per video · 10 credits
              {" · "}
              <span className="font-semibold" style={{ color: atCap ? "#F97066" : "#6B5E7B" }}>
                {images?.length ?? 0} / {MAX_IMAGES}
              </span>
            </p>

            {/* Image Grid (drag to reorder) */}
            {images?.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, index) => (
                  <motion.div
                    key={img.preview}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverIndex(index);
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== index) {
                        reorderImages(dragIndex, index);
                      }
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`relative group aspect-square cursor-grab active:cursor-grabbing transition-all rounded-xl overflow-hidden ${
                      dragIndex === index ? "opacity-40 scale-95" : ""
                    } ${dragOverIndex === index && dragIndex !== index ? "ring-2 ring-offset-2 scale-105" : ""}`}
                    style={dragOverIndex === index && dragIndex !== index ? { ringColor: "#F97066" } : {}}
                  >
                    <img
                      src={img.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div
                      className="absolute top-1 left-1 w-6 h-6 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ background: "rgba(45,34,53,0.5)" }}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span
                      className="absolute bottom-1 left-1 text-white text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(45,34,53,0.6)" }}
                    >
                      {index + 1}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>}

          {/* Style Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3" style={{ color: "#2D2235" }}>
              <Palette className="w-4 h-4 inline mr-1" />
              Pick a style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(isCharacterMode ? STYLE_OPTIONS : styleOptions).map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    console.log("[PromptStep] Style selected:", option.id);
                    setStyle(option.id);
                  }}
                  className="p-4 rounded-2xl border-2 text-left transition-all"
                  style={
                    style === option.id
                      ? { borderColor: "#F97066", background: "rgba(249,112,102,0.06)" }
                      : { borderColor: "rgba(240,234,255,0.8)", background: "rgba(255,255,255,0.6)" }
                  }
                >
                  <span className="text-2xl mb-2 block">{option.icon || STYLE_ICONS[option.id] || "\uD83C\uDFAD"}</span>
                  <span className="font-semibold block" style={{ color: "#2D2235" }}>{option.name}</span>
                  <span className="text-xs" style={{ color: "#9B8FA8" }}>{option.description}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Opening & Closing Frames (image mode only) */}
          {!isCharacterMode && <div className="mb-6">
            <button
              onClick={() => setFrameConfigExpanded(!frameConfigExpanded)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border transition-colors"
              style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(240,234,255,0.8)" }}
            >
              <div className="flex items-center gap-3">
                <Film className="w-5 h-5" style={{ color: "#F97066" }} />
                <span className="font-semibold" style={{ color: "#2D2235" }}>Opening & Closing Frames</span>
                <span className="text-sm" style={{ color: "#9B8FA8" }}>(Optional)</span>
              </div>
              {frameConfigExpanded ? (
                <ChevronUp className="w-5 h-5" style={{ color: "#9B8FA8" }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: "#9B8FA8" }} />
              )}
            </button>

            <AnimatePresence>
              {frameConfigExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="p-4 border border-t-0 rounded-b-2xl space-y-6"
                    style={{ borderColor: "rgba(240,234,255,0.8)", background: "rgba(255,255,255,0.5)" }}
                  >
                    <p className="text-sm" style={{ color: "#6B5E7B" }}>
                      Add intro and outro screens for your video. The AI uses these along with your description to tell a cohesive story.
                    </p>

                    {/* Opening Frame */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ color: "#2D2235" }}>Opening Frame</span>
                        <span className="text-xs" style={{ color: "#9B8FA8" }}>Intro screen before your video</span>
                      </div>

                      <div className="pl-6 space-y-3">
                          <div>
                            <label className="text-xs mb-1 block" style={{ color: "#9B8FA8" }}>What's this frame for?</label>
                            <Textarea
                              value={openingFrame.description || ""}
                              onChange={(e) => setOpeningFrame((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="e.g., This is our brand logo intro — the first thing viewers see..."
                              className="text-sm rounded-xl"
                              rows={2}
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: false }))}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all"
                              style={
                                !openingFrame.useUpload
                                  ? { borderColor: "#F97066", background: "rgba(249,112,102,0.06)", color: "#F97066" }
                                  : { borderColor: "rgba(240,234,255,0.8)", color: "#6B5E7B" }
                              }
                            >
                              <Wand2 className="w-4 h-4" />
                              <span className="text-sm font-medium">AI Generate</span>
                            </button>
                            <button
                              onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: true }))}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all"
                              style={
                                openingFrame.useUpload
                                  ? { borderColor: "#F97066", background: "rgba(249,112,102,0.06)", color: "#F97066" }
                                  : { borderColor: "rgba(240,234,255,0.8)", color: "#6B5E7B" }
                              }
                            >
                              <Upload className="w-4 h-4" />
                              <span className="text-sm font-medium">Upload Image</span>
                            </button>
                          </div>

                          {!openingFrame.useUpload && (
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: "#9B8FA8" }}>Describe the image you want <span className="text-xs italic" style={{ color: "#9B8FA8" }}>(optional — leave blank for auto)</span></label>
                              <Textarea
                                value={openingFrame.customPrompt || ""}
                                onChange={(e) => setOpeningFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                placeholder="e.g., Epic mountain landscape at sunset with dramatic clouds..."
                                className="text-sm rounded-xl"
                                rows={2}
                              />
                            </div>
                          )}

                          {openingFrame.useUpload && (
                            <div>
                              <input
                                ref={openingFileRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                className="hidden"
                                onChange={(e) => handleFrameFileChange(e, "opening")}
                              />
                              {openingFrame.uploadedImage ? (
                                <div className="relative inline-block">
                                  <img
                                    src={openingFrame.uploadedImage}
                                    alt="Opening frame"
                                    className="w-32 h-20 object-cover rounded-xl border"
                                    style={{ borderColor: "rgba(240,234,255,0.8)" }}
                                  />
                                  <button
                                    onClick={() => removeFrameImage("opening")}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openingFileRef.current?.click()}
                                  className="w-full py-3 border-2 border-dashed rounded-xl transition-all flex items-center justify-center gap-2"
                                  style={{ borderColor: "#E0D7FC", color: "#9B8FA8" }}
                                >
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Tap to upload image</span>
                                </button>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="text-xs mb-1 block" style={{ color: "#9B8FA8" }}>Narration / Text Overlay</label>
                            <Input
                              value={openingFrame.textOverlay || ""}
                              onChange={(e) => setOpeningFrame((prev) => ({ ...prev, textOverlay: e.target.value }))}
                              placeholder="e.g., Welcome to our story..."
                              className="text-sm rounded-xl"
                            />
                          </div>
                      </div>
                    </div>

                    <hr style={{ borderColor: "rgba(240,234,255,0.8)" }} />

                    {/* Closing Frame */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ color: "#2D2235" }}>Closing Frame</span>
                        <span className="text-xs" style={{ color: "#9B8FA8" }}>Outro screen after your video</span>
                      </div>

                      <div className="pl-6 space-y-3">
                          <div>
                            <label className="text-xs mb-1 block" style={{ color: "#9B8FA8" }}>What's this frame for?</label>
                            <Textarea
                              value={closingFrame.description || ""}
                              onChange={(e) => setClosingFrame((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="e.g., This is our call-to-action ending — show our website URL..."
                              className="text-sm rounded-xl"
                              rows={2}
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: false }))}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all"
                              style={
                                !closingFrame.useUpload
                                  ? { borderColor: "#F97066", background: "rgba(249,112,102,0.06)", color: "#F97066" }
                                  : { borderColor: "rgba(240,234,255,0.8)", color: "#6B5E7B" }
                              }
                            >
                              <Wand2 className="w-4 h-4" />
                              <span className="text-sm font-medium">AI Generate</span>
                            </button>
                            <button
                              onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: true }))}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all"
                              style={
                                closingFrame.useUpload
                                  ? { borderColor: "#F97066", background: "rgba(249,112,102,0.06)", color: "#F97066" }
                                  : { borderColor: "rgba(240,234,255,0.8)", color: "#6B5E7B" }
                              }
                            >
                              <Upload className="w-4 h-4" />
                              <span className="text-sm font-medium">Upload Image</span>
                            </button>
                          </div>

                          {!closingFrame.useUpload && (
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: "#9B8FA8" }}>Describe the image you want <span className="text-xs italic" style={{ color: "#9B8FA8" }}>(optional — leave blank for auto)</span></label>
                              <Textarea
                                value={closingFrame.customPrompt || ""}
                                onChange={(e) => setClosingFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                placeholder="e.g., Elegant thank you card with soft lighting..."
                                className="text-sm rounded-xl"
                                rows={2}
                              />
                            </div>
                          )}

                          {closingFrame.useUpload && (
                            <div>
                              <input
                                ref={closingFileRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                className="hidden"
                                onChange={(e) => handleFrameFileChange(e, "closing")}
                              />
                              {closingFrame.uploadedImage ? (
                                <div className="relative inline-block">
                                  <img
                                    src={closingFrame.uploadedImage}
                                    alt="Closing frame"
                                    className="w-32 h-20 object-cover rounded-xl border"
                                    style={{ borderColor: "rgba(240,234,255,0.8)" }}
                                  />
                                  <button
                                    onClick={() => removeFrameImage("closing")}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => closingFileRef.current?.click()}
                                  className="w-full py-3 border-2 border-dashed rounded-xl transition-all flex items-center justify-center gap-2"
                                  style={{ borderColor: "#E0D7FC", color: "#9B8FA8" }}
                                >
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Tap to upload image</span>
                                </button>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="text-xs mb-1 block" style={{ color: "#9B8FA8" }}>Narration / Text Overlay</label>
                            <Input
                              value={closingFrame.textOverlay || ""}
                              onChange={(e) => setClosingFrame((prev) => ({ ...prev, textOverlay: e.target.value }))}
                              placeholder="e.g., Thanks for watching!"
                              className="text-sm rounded-xl"
                            />
                          </div>

                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>}

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-medium mb-4"
              style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
            >
              {error}
            </div>
          )}

          {/* Start Button */}
          <Button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="w-full text-white py-6 text-lg font-bold rounded-xl border-0 shadow-lg shadow-orange-200/40 hover:shadow-xl hover:shadow-orange-200/50 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
            style={{ background: canStart && !loading ? "linear-gradient(135deg, #F97066, #FB923C)" : "#D4CDE0" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Starting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Start Creating
                {!canStart && (
                  <span className="text-sm font-normal opacity-75">
                    ({!userPrompt?.trim() ? "enter a description" : "add pictures"})
                  </span>
                )}
              </span>
            )}
          </Button>

          {/* Help text */}
          <p className="text-center text-sm mt-4" style={{ color: "#9B8FA8" }}>
            {isCharacterMode
              ? "Add a character, describe your story, and pick a style to get started"
              : "Add a description and at least one picture to get started"}
          </p>
        </motion.div>
      </div>

      {/* Prompt Guide Modal */}
      <AnimatePresence>
        {showPromptGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(45,34,53,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowPromptGuide(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/60 shadow-2xl"
              style={{ background: "linear-gradient(165deg, #FFFAF6, #FFF7F0, #F8F5FF)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 border-b" style={{ background: "linear-gradient(165deg, #FFFAF6, #FFF7F0)", borderColor: "rgba(240,234,255,0.6)" }}>
                <h2 className="text-xl font-bold" style={{ color: "#2D2235" }}>
                  How to Write a Great Prompt
                </h2>
                <button
                  onClick={() => setShowPromptGuide(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "#F0EAFF", color: "#6B5E7B" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Tip 1 */}
                <div>
                  <h3 className="text-sm font-bold mb-2" style={{ color: "#2D2235" }}>Tell us the story, not just the topic</h3>
                  <div className="space-y-1.5 text-sm" style={{ color: "#6B5E7B" }}>
                    <p><span className="font-semibold" style={{ color: "#DC2626" }}>Weak:</span> "A video about coffee"</p>
                    <p><span className="font-semibold" style={{ color: "#F97066" }}>Better:</span> "A barista crafts a latte from bean to cup in a cozy morning cafe"</p>
                    <p><span className="font-semibold" style={{ color: "#16A34A" }}>Best:</span> "Follow a barista through her morning routine — grinding fresh beans, steaming milk, and pouring latte art for her first customer of the day"</p>
                  </div>
                </div>

                {/* Tip 2 */}
                <div>
                  <h3 className="text-sm font-bold mb-2" style={{ color: "#2D2235" }}>Include these key ingredients</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Who", desc: "The main character(s). Keep it to 1\u20132 people" },
                      { label: "Where", desc: "The setting or location" },
                      { label: "What happens", desc: "The story arc or sequence of events" },
                      { label: "Mood", desc: "How it should feel (warm, dramatic, energetic)" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-3 rounded-xl"
                        style={{ background: "rgba(240,234,255,0.5)" }}
                      >
                        <span className="text-xs font-bold block mb-0.5" style={{ color: "#F97066" }}>{item.label}</span>
                        <span className="text-xs" style={{ color: "#6B5E7B" }}>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tip 3 */}
                <div>
                  <h3 className="text-sm font-bold mb-2" style={{ color: "#2D2235" }}>Structure helps</h3>
                  <p className="text-sm mb-2" style={{ color: "#6B5E7B" }}>
                    Your prompt becomes a series of 5-second clips. Prompts that describe a progression work best:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["First... then... finally...", "From X to Y", "A morning at...", "The moment when..."].map((ex) => (
                      <span
                        key={ex}
                        className="text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ background: "#FFF0E6", color: "#E5582A" }}
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tip 4 */}
                <div>
                  <h3 className="text-sm font-bold mb-2" style={{ color: "#2D2235" }}>Keep it visual and grounded</h3>
                  <p className="text-sm mb-2" style={{ color: "#6B5E7B" }}>
                    Describe things a camera could actually film — the AI needs physical scenes, not abstract ideas.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                      <span className="font-semibold" style={{ color: "#16A34A" }}>Works:</span>{" "}
                      <span style={{ color: "#6B5E7B" }}>"A street musician plays guitar on a rainy sidewalk as people walk by with umbrellas"</span>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.12)" }}>
                      <span className="font-semibold" style={{ color: "#DC2626" }}>Doesn't work:</span>{" "}
                      <span style={{ color: "#6B5E7B" }}>"The universal language of music transcends all barriers and connects souls across time"</span>
                    </div>
                  </div>
                </div>

                {/* Do / Don't */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl" style={{ background: "rgba(22,163,74,0.06)" }}>
                    <h4 className="text-xs font-bold mb-2" style={{ color: "#16A34A" }}>What works best</h4>
                    <ul className="space-y-1.5 text-xs" style={{ color: "#6B5E7B" }}>
                      <li>Simple stories with a clear arc</li>
                      <li>1-2 characters, consistent setting</li>
                      <li>Real-world scenarios</li>
                      <li>Specific details about atmosphere</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-2xl" style={{ background: "rgba(220,38,38,0.04)" }}>
                    <h4 className="text-xs font-bold mb-2" style={{ color: "#DC2626" }}>What to avoid</h4>
                    <ul className="space-y-1.5 text-xs" style={{ color: "#6B5E7B" }}>
                      <li>Vague or abstract concepts</li>
                      <li>Too many characters or locations</li>
                      <li>Overly complex plots</li>
                      <li>Emotions without actions</li>
                    </ul>
                  </div>
                </div>

                {/* Examples */}
                <div>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "#2D2235" }}>Example prompts</h3>
                  <div className="space-y-2">
                    {[
                      "A solo hiker treks through misty mountain trails at dawn, reaching the summit just as the sun breaks through the clouds",
                      "A little girl discovers a hidden garden behind her grandmother's house, exploring the overgrown paths and blooming wildflowers",
                      "Behind the scenes of a pottery studio \u2014 hands shaping wet clay on a spinning wheel, glazing, and the final reveal from the kiln",
                    ].map((example, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl text-sm italic"
                        style={{ background: "rgba(255,240,230,0.6)", color: "#6B5E7B", borderLeft: "3px solid #FB923C" }}
                      >
                        "{example}"
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Order Guide Modal */}
      <AnimatePresence>
        {showImageOrderGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(45,34,53,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowImageOrderGuide(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-3xl border border-white/60 shadow-2xl"
              style={{ background: "linear-gradient(165deg, #FFFAF6, #FFF7F0, #F8F5FF)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b" style={{ borderColor: "rgba(240,234,255,0.6)" }}>
                <h2 className="text-lg font-bold" style={{ color: "#2D2235" }}>
                  Arrange Images Before Script
                </h2>
                <button
                  onClick={() => setShowImageOrderGuide(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "#F0EAFF", color: "#6B5E7B" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm" style={{ color: "#6B5E7B" }}>
                  You can drag and drop images here to set the story order.
                </p>
                <p className="text-sm" style={{ color: "#6B5E7B" }}>
                  The script follows this sequence, so it is best to finalize order before starting.
                </p>

                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={() => setShowImageOrderGuide(false)}
                    className="w-full text-white"
                    style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
                  >
                    Got It
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
