import { useState } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw, Film, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import MediaPlayer from "../MediaPlayer";

/**
 * Edit the AI video-generation prompt for a clip and kick off a regeneration.
 * Mirrors the "Video Generation Prompt" section of the Edit-Clips modal, but
 * focused on just the regenerate action and themed for the timeline editor.
 * The parent handles the long-running job + progress modal.
 *
 * Deliberately a modal, not the expandable clip pill: a video preview plus a
 * multi-line prompt is real content, and the pill is reserved for the
 * slider-only controls (Speed / Volume) that fit beside a clip.
 */
export default function RegenerateClipModal({ section, onClose, onRegenerate, loading }) {
  const [prompt, setPrompt] = useState(section?.aiPrompt || section?.visualDescription || "");
  const [submitting, setSubmitting] = useState(false);
  const busy = submitting || loading;

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
      className="fixed inset-0 editor-scrim flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="bg-card border border-border rounded-xl editor-modal p-5 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" /> Regenerate Clip
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current clip preview - the editor's own player, not native controls. */}
        {section?.generatedClipUrl ? (
          <MediaPlayer kind="video" src={section.generatedClipUrl} poster={section.imageUrl} className="mb-5" />
        ) : section?.imageUrl ? (
          <div className="aspect-video rounded-xl border border-border overflow-hidden editor-screen mb-5">
            <img src={section.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video rounded-xl border border-border bg-muted flex items-center justify-center text-muted-foreground mb-5">
            <Film className="w-8 h-8" />
          </div>
        )}

        {/* Prompt */}
        <label htmlFor="regen-clip-prompt" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Video generation prompt
        </label>
        <Textarea
          id="regen-clip-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Describe what the AI should generate for this clip…"
          className="text-sm focus-visible:border-ring"
        />
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          This prompt is sent to the AI model to regenerate the video clip. Regenerating uses 1 credit.
        </p>

        {/* Actions - same Cancel / primary pair as the transition picker. */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Cancel
          </button>
          <button
            onClick={handleRegenerate}
            disabled={busy || !prompt.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ background: "var(--gradient-brand)" }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate (1 credit)
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
