import { useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CreditAffordabilityCard from "@/components/session/CreditAffordabilityCard";

// The stills per clip next to its line. Approving charges credits and renders the video.
export default function StoryboardReview({
  plan, storyboard, aspectRatio, targetDuration,
  onApprove, onTopUp, onRedraw, onBack, redrawing = null, framing = false, busy,
}) {
  const clips = plan?.clips || [];
  const stillsFor = (index) => storyboard.find((s) => s.index === index)?.stills || [];
  const tall = aspectRatio === "9:16";
  const box = tall ? "aspect-[9/16]" : "aspect-video";
  const locked = busy || framing;
  // Which clip has its "what should change?" box open, and what is typed in it.
  const [asking, setAsking] = useState(null);
  const [note, setNote] = useState("");

  const openAsk = (index) => { setAsking(index); setNote(""); };
  const submitRedraw = (index) => {
    onRedraw(index, note.trim());
    setAsking(null);
    setNote("");
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Your storyboard</h2>
          <p className="text-sm text-ink-muted">These frames steer each clip. Approve to make the video.</p>
        </div>

        {clips.map((clip, i) => {
          const stills = stillsFor(clip.index);
          const drawing = redrawing === clip.index;
          return (
            <div key={clip.index} className="rounded-2xl border border-border/40 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-terra">Clip {i + 1}</span>
                <div className="flex items-center gap-3">
                  {clip.duration ? <span className="text-xs text-ink-muted">{Number(clip.duration).toFixed(1)}s</span> : null}
                  {onRedraw && (
                    <Button variant="outline" size="sm" onClick={() => (asking === clip.index ? setAsking(null) : openAsk(clip.index))} disabled={locked}>
                      {drawing
                        ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                      {drawing ? "Redrawing" : "Redraw"}
                    </Button>
                  )}
                </div>
              </div>
              {onRedraw && asking === clip.index && !locked && (
                <div className="space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    autoFocus
                    aria-label={`What should change in clip ${i + 1}`}
                    placeholder="What should change? e.g. make the kitchen brighter. Leave empty for a fresh take."
                    className="text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAsking(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => submitRedraw(clip.index)}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {note.trim() ? "Redraw with this change" : "Redraw"}
                    </Button>
                  </div>
                </div>
              )}
              <div className={`grid gap-2 ${tall ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
                {stills.length === 0 && (framing ? (
                  <div className={`w-full rounded-lg bg-muted animate-pulse ${box}`} />
                ) : (
                  <button
                    type="button"
                    onClick={onRedraw ? () => openAsk(clip.index) : undefined}
                    disabled={!onRedraw || locked}
                    className={`w-full rounded-lg bg-muted border border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-xs text-ink-muted ${box}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {onRedraw ? "No frames yet. Redraw" : "No frames yet"}
                  </button>
                ))}
                {stills.map((s) => (
                  <a key={s.shotIndex} href={s.url} target="_blank" rel="noreferrer" className={`block w-full rounded-lg overflow-hidden bg-muted border border-border/30 ${box}`}>
                    <img
                      src={s.thumbUrl || s.url}
                      alt={`Clip ${i + 1} shot ${s.shotIndex + 1}`}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover ${drawing ? "opacity-40" : ""}`}
                    />
                  </a>
                ))}
              </div>
              {clip.narration && <p className="text-sm text-ink italic">"{clip.narration}"</p>}
            </div>
          );
        })}

        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white pt-4 pb-2 space-y-3">
          <CreditAffordabilityCard targetDuration={targetDuration} onTopUp={onTopUp} />
          <div className="flex flex-wrap items-center gap-3">
            {onBack && (
              <Button variant="ghost" onClick={onBack} disabled={locked} className="text-ink-muted">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to script
              </Button>
            )}
            <Button
              onClick={onApprove}
              disabled={locked}
              className="flex-1 min-w-[12rem] text-white py-6 text-base"
              style={{ background: "var(--gradient-brand)" }}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5" /> Make my video
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
