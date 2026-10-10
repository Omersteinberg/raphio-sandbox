import { useRef, useState } from "react";
import { ChevronDown, ImagePlus, Mic, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceSelector from "@/components/session/VoiceSelector";
import { PIPELINE_DURATIONS as DURATIONS } from "@/lib/limits";

const MAX_PHOTOS = 10;
const RATIOS = ["16:9", "9:16"];

// The brief: words, photos with an optional name each, length, shape and voice.
export default function BriefStep({
  mode,
  userPrompt, setUserPrompt,
  photos, setPhotos,
  targetDuration, setTargetDuration,
  aspectRatio, setAspectRatio,
  voiceId, setVoiceId,
  onStart,
  starting,
}) {
  const inputRef = useRef(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const showPhotos = mode !== "prompt" || photos.length > 0;

  const addFiles = (files) => {
    const next = Array.from(files || [])
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, preview: URL.createObjectURL(file), label: "" }));
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  };

  const setLabel = (i, label) => setPhotos((prev) => prev.map((p, j) => (j === i ? { ...p, label } : p)));
  const remove = (i) => setPhotos((prev) => prev.filter((_, j) => j !== i));

  return (
    <div className="w-full flex justify-center px-4 pb-16">
      <div className="w-full max-w-2xl rounded-3xl border border-border/40 bg-white shadow-sm p-5 sm:p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">What is the video about?</label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={5}
            placeholder="Describe the business, the offer and who it is for."
            className="w-full rounded-2xl border border-border/50 p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terra/30"
          />
        </div>

        {showPhotos && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-ink">Photos</span>
              <span className="text-xs text-ink-muted">{photos.length}/{MAX_PHOTOS}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((p, i) => (
                <div key={p.preview} className="space-y-1">
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-border/40">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1"
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    value={p.label}
                    onChange={(e) => setLabel(i, e.target.value)}
                    placeholder="Name (optional)"
                    className="w-full rounded-lg border border-border/50 px-2 py-1 text-xs text-ink"
                  />
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-terra/30 bg-terra/5 flex flex-col items-center justify-center gap-1 text-terra text-xs font-semibold"
                >
                  <ImagePlus className="w-5 h-5" />
                  Add photos
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <div>
            <span className="block text-xs font-semibold text-ink-muted mb-1">Length</span>
            <div className="flex gap-1">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTargetDuration(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${targetDuration === d ? "bg-terra text-white border-terra" : "border-border/50 text-ink"}`}
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
                  onClick={() => setAspectRatio(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${aspectRatio === r ? "bg-terra text-white border-terra" : "border-border/50 text-ink"}`}
                >
                  {r === "16:9" ? "Landscape" : "Vertical"}
                </button>
              ))}
            </div>
          </div>
          {setVoiceId && (
            <div>
              <span className="block text-xs font-semibold text-ink-muted mb-1">Voice</span>
              <button
                type="button"
                onClick={() => setVoiceOpen(true)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border border-border/50 text-ink flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" />
                {voiceId ? voiceId.charAt(0).toUpperCase() + voiceId.slice(1) : "Default"}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <Button
          onClick={onStart}
          disabled={starting || !userPrompt.trim()}
          className="w-full text-white py-6 text-base"
          style={{ background: "var(--gradient-brand)" }}
        >
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {starting ? "Starting..." : "Write my script"}
          </span>
        </Button>
        <p className="text-xs text-center text-ink-muted">Free until you approve the storyboard.</p>
      </div>

      {voiceOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setVoiceOpen(false)}>
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-black text-ink">Choose a voice</h3>
              <button
                type="button"
                onClick={() => setVoiceOpen(false)}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <VoiceSelector value={voiceId} onChange={setVoiceId} />
            </div>
            <Button onClick={() => setVoiceOpen(false)} className="w-full mt-4 text-white border-0 shrink-0" style={{ background: "var(--gradient-brand)" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
