import { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, X, Image as ImageIcon, Trash2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImagesStep({
  images,
  addImages,
  removeImage,
  uploadImages,
  analyzeImages,
  imageAnalysis,
  session,
  loading,
  onNext,
}) {
  const fileInputRef = useRef(null);
  const isUploaded = session?.stage === "IMAGES_UPLOADED" || session?.stage === "IMAGES_ANALYZED";
  const isAnalyzed = session?.stage === "IMAGES_ANALYZED";

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addImages(files);
    }
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "image/jpeg" || f.type === "image/png"
    );
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      {/* Left Side - Image Upload */}
      <div className="flex-1 flex flex-col p-6 border-r border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Images</h2>
            <p className="text-sm text-gray-600">Add images for your video scenes</p>
          </div>
          {images.length > 0 && !isUploaded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => images.forEach((_, i) => removeImage(i))}
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
          disabled={isUploaded}
        />

        {!isUploaded && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors mb-4"
          >
            <Upload className="w-10 h-10 text-purple-500 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">
              Drop images here or click to upload
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports JPEG and PNG only
            </p>
          </div>
        )}

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto">
          {images.length === 0 && !session?.images?.length ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No images added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Local images (before upload) */}
              {!isUploaded && images.map((img, index) => (
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
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">
                    {index + 1}
                  </span>
                </motion.div>
              ))}

              {/* Server images (after upload) */}
              {isUploaded && session?.images?.map((img, index) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group aspect-square"
                >
                  <img
                    src={img.imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">
                    {index + 1}
                  </span>
                  {img.analysis && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                      Analyzed
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          {!isUploaded && images.length > 0 && (
            <Button
              onClick={uploadImages}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? "Uploading..." : `Upload ${images.length} Images`}
            </Button>
          )}

          {isUploaded && !isAnalyzed && (
            <Button
              onClick={analyzeImages}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Analyze Images
                </span>
              )}
            </Button>
          )}

          {isAnalyzed && (
            <Button
              onClick={onNext}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <span className="flex items-center gap-2">
                Continue to Script
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Right Side - Analysis Results */}
      <div className="w-full lg:w-96 flex flex-col bg-gray-50 p-6 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Image Analysis</h3>

        {!imageAnalysis ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Sparkles className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm text-center">
              Upload and analyze your images to see AI-generated insights
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {imageAnalysis.imageCount}
                  </div>
                  <div className="text-xs text-gray-500">Images</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {imageAnalysis.analyzedCount}
                  </div>
                  <div className="text-xs text-gray-500">Analyzed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {imageAnalysis.failedCount}
                  </div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>
            </div>

            {/* Aggregated Insights */}
            {imageAnalysis.aggregated && (
              <>
                {imageAnalysis.aggregated.subjects?.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Subjects</h4>
                    <div className="flex flex-wrap gap-2">
                      {imageAnalysis.aggregated.subjects.map((subject, i) => (
                        <span key={i} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {imageAnalysis.aggregated.moods?.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Moods</h4>
                    <div className="flex flex-wrap gap-2">
                      {imageAnalysis.aggregated.moods.map((mood, i) => (
                        <span key={i} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                          {mood}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {imageAnalysis.aggregated.settings?.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Settings</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {imageAnalysis.aggregated.settings.map((setting, i) => (
                        <li key={i}>• {setting}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
