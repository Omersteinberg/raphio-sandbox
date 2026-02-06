import { useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, Palette, Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STYLE_OPTIONS = [
  { id: "cinematic", name: "Cinematic", icon: "🎬", description: "Epic, dramatic, emotional" },
  { id: "documentary", name: "Documentary", icon: "📹", description: "Authentic, grounded" },
  { id: "social", name: "Social", icon: "📱", description: "Upbeat, trendy, fast-paced" },
  { id: "dramatic", name: "Dramatic", icon: "🎭", description: "Intense, suspenseful" },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30s", description: "Short & snappy" },
  { value: 60, label: "1 min", description: "Standard" },
  { value: 120, label: "2 min", description: "Extended" },
  { value: 180, label: "3 min", description: "Long form" },
];

export default function PromptStep({
  userPrompt,
  setUserPrompt,
  style,
  setStyle,
  targetDuration,
  setTargetDuration,
  images,
  addImages,
  removeImage,
  onStart,
  loading,
}) {
  const fileInputRef = useRef(null);

  console.log("[PromptStep] Rendering with:", {
    userPrompt: userPrompt?.substring(0, 50),
    style,
    targetDuration,
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
      f.type.startsWith("image/")
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
      targetDuration,
      imagesCount: images?.length || 0,
    });
    onStart();
  };

  const canStart = userPrompt?.trim() && images?.length > 0;

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
              accept="image/*"
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
                These images will be used to create your video scenes
              </p>
            </div>

            {/* Image Grid */}
            {images?.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group aspect-square"
                  >
                    <img
                      src={img.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("[PromptStep] Removing image at index:", index);
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

          {/* Duration Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Clock className="w-4 h-4 inline mr-1" />
              Target Duration
            </label>
            <div className="flex gap-3">
              {DURATION_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    console.log("[PromptStep] Duration selected:", option.value);
                    setTargetDuration(option.value);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all ${
                    targetDuration === option.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="font-semibold text-gray-900 block">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </motion.button>
              ))}
            </div>
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
