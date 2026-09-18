import { useState } from "react";
import { RefreshCw, Film, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import MediaPlayer from "../MediaPlayer";
import EditorModalShell from "./EditorModalShell";

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
    <EditorModalShell
      icon={Film}
      title="Regenerate Clip"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
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
      }
    >
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
    </EditorModalShell>
  );
}
