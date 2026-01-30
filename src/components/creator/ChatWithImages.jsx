import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MergeChatbox from "@/components/merge/MergeChatbox";

const cardData = [
  {
    title: "Birthday Video",
    description: "Craft a heartfelt birthday video using personal images and AI effects.",
  },
  {
    title: "Business Ad",
    description: "Promote your product with a compelling AI-powered video ad.",
  },
  {
    title: "Social Content",
    description: "Create eye-catching short-form content for social platforms.",
  },
];

export default function ChatWithImages({
  // Chat props
  messages,
  handleSendMessage,
  handleCardClick,
  loading: chatLoading,
  // Image props
  images,
  addImages,
  removeImage,
  clearImages,
}) {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (message.trim()) {
      handleSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
      f.type.startsWith("image/")
    );
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="w-full h-full flex">
      {/* Left Side - Chat */}
      <div className="flex-1 flex flex-col border-r border-gray-100">
        {messages.length === 0 ? (
          // Initial state with cards
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              What's Your Story?
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Tell us about the video you want to create
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {cardData.map((card, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick(card.description)}
                  className="w-48 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all"
                >
                  <h3 className="font-medium text-gray-900 mb-1">{card.title}</h3>
                  <p className="text-xs text-gray-600">{card.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          // Chat messages
          <div className="flex-1 overflow-y-auto p-4">
            <MergeChatbox messages={messages} isTyping={chatLoading} />
          </div>
        )}

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your video idea..."
              className="flex-1 min-h-[50px] max-h-[120px] resize-none bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || chatLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Image Upload */}
      <div className="w-80 lg:w-96 flex flex-col bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Images ({images.length})
          </h3>
          {images.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearImages}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
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
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors mb-4"
        >
          <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-gray-700 font-medium">
            Drop images here or click to upload
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Upload all images for your video
          </p>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto">
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, index) => (
                <motion.div
                  key={img.id}
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
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
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

        {/* Help Text */}
        <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-200">
          <p className="text-xs text-purple-800">
            <strong>Tip:</strong> Upload all images you want to use in your video.
            You'll assign them to sections in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}
