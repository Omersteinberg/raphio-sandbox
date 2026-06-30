import { useState } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Edit the AI video-generation prompt for a clip and kick off a regeneration.
 * Mirrors the "Video Generation Prompt" section of the Edit-Clips modal, but
 * focused on just the regenerate action and themed for the timeline editor.
 * The parent handles the long-running job + progress modal.
 */
export default function RegenerateClipModal({ section, onClose, onRegenerate, loading }) {
  const [prompt, setPrompt] = useState(section?.aiPrompt || section?.visualDescription || "");
  const [submitting, setSubmitting] = useState(false);

  const handleRegenerate = async () => {
    setSubmitting(true);
    try {
      await onRegenerate(prompt);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-xl p-4 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Film className="w-5 h-5" /> Regenerate Clip
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current clip preview */}
        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
          {section?.generatedClipUrl ? (
            <video src={section.generatedClipUrl} controls className="w-full h-full object-cover" />
          ) : section?.imageUrl ? (
            <img src={section.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Film className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Prompt */}
        <label className="text-sm font-medium text-foreground/80 mb-1 block">
          Video Generation Prompt
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Describe what the AI should generate for this clip…"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          This prompt is sent to the AI model to regenerate the video clip. Regenerating uses 1 credit.
        </p>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting || loading}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={submitting || loading || !prompt.trim()}
            className="text-white border-0"
            style={{ background: "var(--gradient-brand)" }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Regenerate (1 credit)
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
