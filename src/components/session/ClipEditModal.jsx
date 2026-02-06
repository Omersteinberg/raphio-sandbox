import { useState } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw, Mic, Film, Image, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ClipEditModal({
  clip,
  onClose,
  onSave,
  onRegenerate,
  onRegenerateNarration,
  loading,
}) {
  const [narrationText, setNarrationText] = useState(clip.narrationText || "");
  const [visualDescription, setVisualDescription] = useState(clip.visualDescription || "");
  const [aiPrompt, setAiPrompt] = useState(clip.aiPrompt || clip.visualDescription || "");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingNarration, setRegeneratingNarration] = useState(false);

  const hasChanges =
    narrationText !== (clip.narrationText || "") ||
    visualDescription !== (clip.visualDescription || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      // If narration text changed, regenerate TTS audio along with saving
      const narrationChanged = narrationText !== (clip.narrationText || "");
      if (narrationChanged && onRegenerateNarration) {
        await onRegenerateNarration({ narrationText });
      }
      await onSave({
        narrationText,
        visualDescription,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate({ prompt: aiPrompt, imageUrl: clip.imageUrl });
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateNarration = async () => {
    if (!onRegenerateNarration) return;
    setRegeneratingNarration(true);
    try {
      await onRegenerateNarration({ narrationText });
    } finally {
      setRegeneratingNarration(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Edit Clip</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clip Preview */}
        <div className="flex gap-4 mb-6">
          {/* Video/Image Preview */}
          <div className="w-48 flex-shrink-0">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative mb-2">
              {clip.generatedClipUrl ? (
                <video
                  src={clip.generatedClipUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : clip.imageUrl ? (
                <img
                  src={clip.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <Film className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Source Image */}
            {clip.imageUrl && (
              <div className="relative">
                <p className="text-xs text-gray-500 mb-1">Source Image</p>
                <img
                  src={clip.imageUrl}
                  alt="Source"
                  className="w-full aspect-video object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>

          {/* Clip Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                clip.sectionType === "OPENING"
                  ? "bg-green-100 text-green-800"
                  : clip.sectionType === "CLOSING"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-purple-100 text-purple-800"
              }`}>
                {clip.sectionType}
              </span>
              <span className="text-sm text-gray-500">
                Duration: {clip.clipDuration || 5}s
              </span>
              {clip.regenerationCount > 0 && (
                <span className="text-xs text-gray-400">
                  Regenerated {clip.regenerationCount}x
                </span>
              )}
            </div>

            {/* Narration URL indicator */}
            {clip.narrationUrl && (
              <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                <Mic className="w-3 h-3" />
                Has narration audio
              </div>
            )}
          </div>
        </div>

        {/* Edit Fields */}
        <div className="space-y-4">
          {/* Narration Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Narration Text
              </label>
              {onRegenerateNarration && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateNarration}
                  disabled={regeneratingNarration || loading || !narrationText.trim()}
                  className="text-xs"
                >
                  {regeneratingNarration ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  Regenerate Audio
                </Button>
              )}
            </div>
            <Textarea
              value={narrationText}
              onChange={(e) => setNarrationText(e.target.value)}
              placeholder="Enter narration text for this clip..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Visual Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
              <Image className="w-4 h-4" />
              Visual Description
            </label>
            <Textarea
              value={visualDescription}
              onChange={(e) => setVisualDescription(e.target.value)}
              placeholder="Describe the visual content for this clip..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* AI Generation Prompt */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Video Generation Prompt
              </label>
            </div>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Customize the prompt used to generate the video clip..."
              rows={3}
              className="text-sm bg-white"
            />
            <p className="text-xs text-gray-500 mt-2">
              This prompt will be sent to the AI model to regenerate the video clip.
            </p>
            <Button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {regenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Regenerating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Video Clip
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
