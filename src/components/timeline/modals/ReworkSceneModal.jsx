import { useState } from "react";
import { Wand2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MediaPlayer from "../MediaPlayer";
import EditorModalShell from "./EditorModalShell";

/**
 * Rework one scene of a brand intro from a note.
 *
 * The intro's counterpart to RegenerateClipModal. An intro scene is not AI
 * footage generated from a prompt, it is a designed, branded scene, so there is
 * no "video generation prompt" to edit here: the model is told what to CHANGE and
 * redraws the beat. It costs no credits, and it can take a couple of minutes
 * because the scene is rewritten, rebuilt and re-recorded.
 *
 * The warning is not boilerplate. A reworked scene loses its fixed length and the
 * whole intro is re-timed around it, so every beat can move and the timeline has
 * to be rebuilt from the new plan.
 */
export default function ReworkSceneModal({ section, onClose, onRework, loading }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRework = async () => {
    setSubmitting(true);
    try {
      await onRework(note.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const sceneNumber = Number.isFinite(section?.orderIndex) ? section.orderIndex + 1 : null;

  return (
    <EditorModalShell
      icon={Wand2}
      title={sceneNumber ? `Rework scene ${sceneNumber}` : "Rework scene"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting || loading}>
            Cancel
          </Button>
          <Button
            onClick={handleRework}
            disabled={submitting || loading || !note.trim()}
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
                <Wand2 className="w-4 h-4" />
                Rework scene
              </span>
            )}
          </Button>
        </div>
      }
    >
        {/* Current scene preview - MediaPlayer (same custom controls as the
            other modals), not the native <video controls> this used to
            show. */}
        {section?.generatedClipUrl ? (
          <MediaPlayer kind="video" src={section.generatedClipUrl} poster={section.imageUrl} className="mb-5" />
        ) : section?.imageUrl ? (
          <div className="aspect-video rounded-xl border border-border overflow-hidden editor-screen mb-5">
            <img src={section.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video rounded-xl border border-border bg-muted flex items-center justify-center text-muted-foreground mb-5">
            <Wand2 className="w-8 h-8" />
          </div>
        )}

        {/* Note */}
        <label className="text-sm font-medium text-foreground/80 mb-1 block">
          What should change about this scene?
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Make the headline shorter and put the logo in the middle…"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Describe the change, not the whole scene. We rewrite the copy, redraw the
          scene and re-record its line.
        </p>

        {/* What it costs the rest of the edit */}
        <div className="mt-4 flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">
            Reworking re-times the whole intro, so your timeline will be rebuilt and
            any trims, splits or added audio will be reset.
          </p>
        </div>
    </EditorModalShell>
  );
}
