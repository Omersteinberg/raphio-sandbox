import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VoiceSelector from "@/components/session/VoiceSelector";
import { PIPELINE_DURATIONS } from "@/lib/limits";

const RATIOS = ["16:9", "9:16"];

// Length, shape and voice for a rewrite. Only the choices that differ from the run are sent.
function ChangeSheet({ open, onOpenChange, targetDuration, aspectRatio, voiceId, onRewrite, busy }) {
  const [length, setLength] = useState(targetDuration);
  const [shape, setShape] = useState(aspectRatio);
  const [voice, setVoice] = useState(voiceId);

  useEffect(() => {
    if (!open) return;
    setLength(targetDuration);
    setShape(aspectRatio);
    setVoice(voiceId);
  }, [open, targetDuration, aspectRatio, voiceId]);

  const submit = () => {
    const input = {};
    if (length && Number(length) !== Number(targetDuration)) input.targetDuration = length;
    if (shape && shape !== aspectRatio) input.aspectRatio = shape;
    if (voice && voice !== voiceId) input.voiceId = voice;
    onRewrite(input);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-ink">Change your video</DialogTitle>
          <DialogDescription className="text-ink-muted">Pick a new length, shape or voice, then rewrite the script.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="block text-xs font-semibold text-ink-muted mb-1">Length</span>
            <div className="flex gap-1">
              {PIPELINE_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setLength(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${length === d ? "bg-terra text-white border-terra" : "border-border/50 text-ink"}`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-ink-muted mb-1">Shape</span>
            <div className="flex gap-1">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setShape(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${shape === r ? "bg-terra text-white border-terra" : "border-border/50 text-ink"}`}
                >
                  {r === "16:9" ? "Landscape" : "Vertical"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <span className="block text-xs font-semibold text-ink-muted mb-1">Voice</span>
          <VoiceSelector value={voice} onChange={setVoice} />
        </div>
        <p className="text-xs text-ink-muted">Changing the length writes a new script. Your edits will be replaced.</p>
        <Button onClick={submit} disabled={busy} className="w-full text-white" style={{ background: "var(--gradient-brand)" }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Rewrite script
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// One editable card per clip. Saving redoes the voice and storyboard; approving draws the stills.
export default function ScriptReview({
  plan, videoSeconds, targetDuration, aspectRatio, voiceId,
  onSave, onApprove, onBack, onRegenerate, busy,
}) {
  const [draft, setDraft] = useState([]);
  const [changing, setChanging] = useState(false);
  const seconds = videoSeconds ?? plan?.videoSeconds;
  const length = seconds
    ? `, runs ${Math.round(seconds)}s${targetDuration ? ` (target ${targetDuration}s)` : ""}`
    : targetDuration ? `, target ${targetDuration}s` : "";

  useEffect(() => {
    setDraft((plan?.clips || []).map((c) => ({ ...c })));
  }, [plan]);

  const dirty = useMemo(() => draft.some((d, i) => {
    const c = plan?.clips?.[i];
    return c && (d.narration !== c.narration || d.visual !== c.visual);
  }), [draft, plan]);

  const set = (i, field, value) => setDraft((prev) => prev.map((d, j) => (j === i ? { ...d, [field]: value } : d)));

  const rewrite = async (input) => {
    if (await onRegenerate(input)) setChanging(false);
  };

  const changed = () => draft
    .filter((d, i) => d.narration !== plan.clips[i].narration || d.visual !== plan.clips[i].visual)
    .map(({ index, narration, visual }) => ({ index, narration, visual }));

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">{plan?.title || "Your script"}</h2>
          <p className="text-sm text-ink-muted">
            {draft.length} clips{length}. Edit anything, then approve to see the storyboard.
          </p>
        </div>

        {draft.map((clip, i) => (
          <div key={clip.index} className="rounded-2xl border border-border/40 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-terra">Clip {i + 1}</span>
              {clip.duration ? <span className="text-xs text-ink-muted">{Number(clip.duration).toFixed(1)}s</span> : null}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Voiceover</label>
              <textarea
                value={clip.narration}
                onChange={(e) => set(i, "narration", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border/50 p-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">What we see</label>
              <textarea
                value={clip.visual}
                onChange={(e) => set(i, "visual", e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border/50 p-2 text-sm text-ink"
              />
            </div>
          </div>
        ))}

        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white pt-4 pb-2 flex flex-wrap items-center gap-3">
          {onBack && (
            <Button variant="ghost" onClick={onBack} disabled={busy} className="text-ink-muted">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          {onRegenerate && (
            <Button variant="outline" onClick={() => setChanging(true)} disabled={busy}>
              <SlidersHorizontal className="w-4 h-4 mr-2" /> Change
            </Button>
          )}
          {dirty && (
            <Button variant="outline" onClick={() => onSave(changed())} disabled={busy} className="flex-1">
              <Save className="w-4 h-4 mr-2" /> Save changes
            </Button>
          )}
          <Button
            onClick={onApprove}
            disabled={busy || dirty}
            className="flex-1 text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Check className="w-4 h-4 mr-2" /> Approve script
          </Button>
        </div>
        {dirty && <p className="text-xs text-center text-ink-muted">Save your changes before approving.</p>}
      </div>
      {onRegenerate && (
        <ChangeSheet
          open={changing}
          onOpenChange={setChanging}
          targetDuration={targetDuration}
          aspectRatio={aspectRatio}
          voiceId={voiceId}
          onRewrite={rewrite}
          busy={busy}
        />
      )}
    </div>
  );
}
