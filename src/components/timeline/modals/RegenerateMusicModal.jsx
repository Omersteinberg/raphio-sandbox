import { useState } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Edit the background-music style prompt and kick off a regeneration.
 * Doubles as "add music" for a video that was rendered without any: pass no
 * `currentUrl` and the copy switches from replacing a track to creating one.
 * The parent handles the long-running job + progress modal.
 */
export default function RegenerateMusicModal({ musicPrompt, currentUrl, onClose, onRegenerate, loading }) {
  const [prompt, setPrompt] = useState(musicPrompt || "");
  const [submitting, setSubmitting] = useState(false);
  const hasMusic = !!currentUrl;

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
            <Music className="w-5 h-5" /> {hasMusic ? "Regenerate Music" : "Add Background Music"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current track */}
        {hasMusic ? (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1.5">Current track</p>
            <audio src={currentUrl} controls className="w-full" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">
            This video has no background music yet. Describe the style you want and we will
            generate a track that runs the full length of the timeline.
          </p>
        )}

        {/* Prompt */}
        <label className="text-sm font-medium text-foreground/80 mb-1 block">
          Music Style Prompt
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. warm acoustic guitar, slow and hopeful, no drums"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {hasMusic
            ? "The new track replaces the current one on the music track, keeping its position and volume. Free, and you can regenerate as often as you like."
            : "The new track is added to the music track under your narration. Free, and you can regenerate as often as you like."}
        </p>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting || loading}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={submitting || loading}
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
                {hasMusic ? "Regenerate" : "Generate"}
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
