import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Edit3, RefreshCw, Upload, Trash2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function BridgeSectionCard({
  section,
  contentIndex,
  originalIndex,
  isApproved,
  isOutlineStage,
  sessionImages,
  onEdit,
  onRemove,
  onRetry,
  onUploadImage,
  loading,
}) {
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef(null);

  const referenceImages = (section.referenceImageIndices || [])
    .map(idx => sessionImages[idx])
    .filter(Boolean);

  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800",
    generating: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  }[section.bridgeStatus] || "bg-gray-100 text-gray-800";

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(section.orderIndex, file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: contentIndex * 0.05 }}
      className={`bg-white rounded-lg border-2 border-dashed p-4 ${
        section.bridgeStatus === "failed" ? "border-red-300" : "border-purple-300"
      }`}
    >
      <div className="flex gap-4">
        {/* Image / Placeholder */}
        <div className="flex-shrink-0">
          {section.bridgeImageUrl ? (
            <div className="relative">
              <img
                src={section.bridgeImageUrl}
                alt={`Bridge frame ${contentIndex + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-purple-200"
              />
              <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                <Sparkles className="w-3 h-3" /> Bridge
              </span>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg bg-purple-50 border-2 border-dashed border-purple-200 flex flex-col items-center justify-center text-purple-400">
              <Sparkles className="w-6 h-6 mb-1" />
              <span className="text-xs">Bridge</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                BRIDGE
              </span>
              {section.bridgeStatus && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                  {section.bridgeStatus.toUpperCase()}
                </span>
              )}
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {section.suggestedDuration || 8}s
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!isApproved && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(originalIndex)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {section.bridgeStatus === "failed" && section.bridgeError && (
            <div className="mb-2 p-2 bg-red-50 rounded text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{section.bridgeError}</span>
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Narration</label>
                <Textarea
                  value={section.narrationText || ""}
                  onChange={(e) => onEdit(originalIndex, "narrationText", e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Visual Description (motion)</label>
                <Textarea
                  value={section.visualDescription || ""}
                  onChange={(e) => onEdit(originalIndex, "visualDescription", e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </div>
              {isOutlineStage && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bridge Image Prompt (still image)</label>
                  <Textarea
                    value={section.bridgeImagePrompt || ""}
                    onChange={(e) => onEdit(originalIndex, "bridgeImagePrompt", e.target.value)}
                    className="text-sm"
                    rows={3}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Duration (seconds)</label>
                <Input
                  type="number"
                  value={section.suggestedDuration || 8}
                  onChange={(e) => onEdit(originalIndex, "suggestedDuration", parseInt(e.target.value) || 8)}
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
                <p className="text-sm text-gray-500 italic mb-2">
                  Visual: {section.visualDescription}
                </p>
              )}
              {isOutlineStage && section.bridgeImagePrompt && (
                <p className="text-sm text-purple-600 mb-2">
                  Image prompt: {section.bridgeImagePrompt}
                </p>
              )}
            </>
          )}

          {referenceImages.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">References:</span>
              {referenceImages.map((img, i) => (
                <img
                  key={i}
                  src={img.imageUrl || img.preview}
                  alt={`Ref ${i + 1}`}
                  className="w-8 h-8 rounded object-cover border border-gray-200"
                />
              ))}
            </div>
          )}

          {!isOutlineStage && section.bridgeStatus === "failed" && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry([section.orderIndex])}
                disabled={loading}
                className="text-purple-700 border-purple-300"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Upload className="w-3 h-3 mr-1" /> Upload Image
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemove(originalIndex)}
                disabled={loading}
                className="text-red-600 border-red-300"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Remove
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
