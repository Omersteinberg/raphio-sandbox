import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Palette, Upload, X, Image as ImageIcon, Trash2, Film, Wand2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const STYLE_OPTIONS = [
  { id: "realistic", name: "Realistic", icon: "📷", description: "Photorealistic, natural, lifelike" },
  { id: "animated", name: "Animated", icon: "🎨", description: "Cartoon, vibrant, stylized" },
  { id: "cinematic", name: "Cinematic", icon: "🎬", description: "Film-like, dramatic, moody" },
  { id: "surreal", name: "Surreal", icon: "✨", description: "Dreamlike, abstract, artistic" },
];

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
}) {
  const fileInputRef = useRef(null);
  const openingFileRef = useRef(null);
  const closingFileRef = useRef(null);
  const [frameConfigExpanded, setFrameConfigExpanded] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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
      openingFrame: { enabled: openingFrame?.enabled, useUpload: openingFrame?.useUpload, customPrompt: openingFrame?.customPrompt },
      closingFrame: { enabled: closingFrame?.enabled, useUpload: closingFrame?.useUpload, customPrompt: closingFrame?.customPrompt },
    });
    onStart();
  };

  // Require custom prompt for AI-generated frames
  const openingNeedsPrompt = openingFrame?.enabled && !openingFrame?.useUpload && !openingFrame?.customPrompt?.trim();
  const closingNeedsPrompt = closingFrame?.enabled && !closingFrame?.useUpload && !closingFrame?.customPrompt?.trim();
  const canStart = userPrompt?.trim() && images?.length > 0 && !openingNeedsPrompt && !closingNeedsPrompt;

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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Your Video
            </h1>
            <p className="text-gray-600">
              Describe the video you want to create and upload your images
            </p>
          </div>

          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your video about?
            </label>
            <Textarea
              value={userPrompt}
              onChange={(e) => {
                console.log("[PromptStep] Prompt changed:", e.target.value.substring(0, 30));
                setUserPrompt(e.target.value);
              }}
              placeholder="e.g., A promotional video for my coffee shop showing our cozy atmosphere, specialty drinks, and friendly baristas..."
              className="w-full min-h-[120px] bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Image Upload Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Upload Images ({images?.length || 0})
              </label>
              {images?.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log("[PromptStep] Clearing all images");
                    images.forEach((_, i) => removeImage(i));
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Drop Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
            />
            <div
              onClick={() => {
                console.log("[PromptStep] Drop zone clicked, opening file picker");
                fileInputRef.current?.click();
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors mb-4"
            >
              <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-gray-700 font-medium">
                Drop images here or click to upload
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports JPEG and PNG only
              </p>
            </div>

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
                    className={`relative group aspect-square cursor-grab active:cursor-grabbing transition-all ${
                      dragIndex === index ? "opacity-40 scale-95" : ""
                    } ${dragOverIndex === index && dragIndex !== index ? "ring-2 ring-primary ring-offset-2 scale-105" : ""}`}
                  >
                    <img
                      src={img.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg pointer-events-none"
                    />
                    <div className="absolute top-1 left-1 w-6 h-6 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                      {index + 1}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Style Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Palette className="w-4 h-4 inline mr-1" />
              Video Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STYLE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    console.log("[PromptStep] Style selected:", option.id);
                    setStyle(option.id);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    style === option.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl mb-2 block">{option.icon}</span>
                  <span className="font-medium text-gray-900 block">{option.name}</span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Opening & Closing Frames */}
          <div className="mb-6">
            <button
              onClick={() => setFrameConfigExpanded(!frameConfigExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Film className="w-5 h-5 text-primary" />
                <span className="font-medium text-gray-900">Opening & Closing Frames</span>
                <span className="text-sm text-gray-500">(Optional)</span>
              </div>
              {frameConfigExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
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
                  <div className="p-4 border border-t-0 border-gray-200 rounded-b-lg space-y-6 bg-white">
                    <p className="text-sm text-gray-600">
                      Configure opening and closing frames for your video. These are analyzed by AI along with your prompt to create a cohesive story.
                    </p>

                    {/* Opening Frame */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={openingFrame?.enabled}
                            onChange={(e) => setOpeningFrame((prev) => ({ ...prev, enabled: e.target.checked }))}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                          />
                          <span className="font-medium text-gray-900">Opening Frame</span>
                        </label>
                        {openingFrame?.enabled && (
                          <span className="text-xs text-gray-500">Intro screen before your video</span>
                        )}
                      </div>

                      {openingFrame?.enabled && (
                        <div className="pl-6 space-y-3">
                          {/* Explanation / Context */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">What's happening in this frame? How should AI use it?</label>
                            <Textarea
                              value={openingFrame.description || ""}
                              onChange={(e) => setOpeningFrame((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="e.g., This is our brand logo intro — use it as the first thing viewers see to establish brand identity before the main content begins..."
                              className="text-sm"
                              rows={2}
                            />
                          </div>

                          {/* Toggle between AI and Upload */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: false }))}
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                !openingFrame.useUpload
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Wand2 className="w-4 h-4" />
                              <span className="text-sm">AI Generate</span>
                            </button>
                            <button
                              onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: true }))}
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                openingFrame.useUpload
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">Upload Image</span>
                            </button>
                          </div>

                          {/* AI Generate Option */}
                          {!openingFrame.useUpload && (
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">AI Image Prompt <span className="text-red-500">*</span></label>
                              <Textarea
                                value={openingFrame.customPrompt || ""}
                                onChange={(e) => setOpeningFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                placeholder="e.g., Epic mountain landscape at sunset with dramatic clouds..."
                                className={`text-sm ${openingNeedsPrompt ? "border-red-300 focus:border-red-500" : ""}`}
                                rows={2}
                              />
                              {openingNeedsPrompt && (
                                <p className="text-xs text-red-500 mt-1">Please enter an AI prompt to generate the opening frame image</p>
                              )}
                            </div>
                          )}

                          {/* Upload Option */}
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
                                    className="w-32 h-20 object-cover rounded-lg border border-gray-200"
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
                                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Click to upload image</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Narration Text */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Narration / Text Overlay</label>
                            <Input
                              value={openingFrame.textOverlay || ""}
                              onChange={(e) => setOpeningFrame((prev) => ({ ...prev, textOverlay: e.target.value }))}
                              placeholder="e.g., Welcome to our story..."
                              className="text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <hr className="border-gray-200" />

                    {/* Closing Frame */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={closingFrame?.enabled}
                            onChange={(e) => setClosingFrame((prev) => ({ ...prev, enabled: e.target.checked }))}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                          />
                          <span className="font-medium text-gray-900">Closing Frame</span>
                        </label>
                        {closingFrame?.enabled && (
                          <span className="text-xs text-gray-500">Outro screen after your video</span>
                        )}
                      </div>

                      {closingFrame?.enabled && (
                        <div className="pl-6 space-y-3">
                          {/* Explanation / Context */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">What's happening in this frame? How should AI use it?</label>
                            <Textarea
                              value={closingFrame.description || ""}
                              onChange={(e) => setClosingFrame((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="e.g., This is our call-to-action ending — show our website URL and social media handles so viewers know where to find us..."
                              className="text-sm"
                              rows={2}
                            />
                          </div>

                          {/* Toggle between AI and Upload */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: false }))}
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                !closingFrame.useUpload
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Wand2 className="w-4 h-4" />
                              <span className="text-sm">AI Generate</span>
                            </button>
                            <button
                              onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: true }))}
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                closingFrame.useUpload
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">Upload Image</span>
                            </button>
                          </div>

                          {/* AI Generate Option */}
                          {!closingFrame.useUpload && (
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">AI Image Prompt <span className="text-red-500">*</span></label>
                              <Textarea
                                value={closingFrame.customPrompt || ""}
                                onChange={(e) => setClosingFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                placeholder="e.g., Elegant thank you card with soft lighting..."
                                className={`text-sm ${closingNeedsPrompt ? "border-red-300 focus:border-red-500" : ""}`}
                                rows={2}
                              />
                              {closingNeedsPrompt && (
                                <p className="text-xs text-red-500 mt-1">Please enter an AI prompt to generate the closing frame image</p>
                              )}
                            </div>
                          )}

                          {/* Upload Option */}
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
                                    className="w-32 h-20 object-cover rounded-lg border border-gray-200"
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
                                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Click to upload image</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Narration Text */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Narration / Text Overlay</label>
                            <Input
                              value={closingFrame.textOverlay || ""}
                              onChange={(e) => setClosingFrame((prev) => ({ ...prev, textOverlay: e.target.value }))}
                              placeholder="e.g., Thanks for watching!"
                              className="text-sm"
                            />
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="w-full bg-secondary hover:bg-secondary/90 text-white py-6 text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ({!userPrompt?.trim() ? "enter prompt" : "upload images"})
                  </span>
                )}
              </span>
            )}
          </Button>

          {/* Help text */}
          <p className="text-center text-sm text-gray-500 mt-4">
            You need both a prompt and at least one image to continue
          </p>
        </motion.div>
      </div>
    </div>
  );
}
