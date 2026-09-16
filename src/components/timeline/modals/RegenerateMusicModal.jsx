import { useState } from "react";
import { RefreshCw, Music, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import MediaPlayer from "../MediaPlayer";
import EditorModalShell from "./EditorModalShell";

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
      icon={Music}
      title={hasMusic ? "Regenerate Music" : "Add Background Music"}
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
            disabled={busy}
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
                {hasMusic ? "Regenerate" : "Generate"}
              </>
            )}
          </button>
        </div>
      }
    >
        {/* Current track - the editor's compact audio player, not a native
            <audio controls> element. */}
        {hasMusic ? (
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Current track</p>
            <MediaPlayer kind="audio" src={currentUrl} label="Background music" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            This video has no background music yet. Describe the style you want and we will
            generate a track that runs the full length of the timeline.
          </p>
        )}

        {/* Prompt */}
        <label htmlFor="regen-music-prompt" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Music style prompt
        </label>
        <Textarea
          id="regen-music-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. warm acoustic guitar, slow and hopeful, no drums"
          className="text-sm focus-visible:border-ring"
        />
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {hasMusic
            ? "The new track replaces the current one on the music track, keeping its position and volume. Free, and you can regenerate as often as you like."
            : "The new track is added to the music track under your narration. Free, and you can regenerate as often as you like."}
        </p>
    </EditorModalShell>
  );
}
