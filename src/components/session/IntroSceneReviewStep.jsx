import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Mic, Music, Play, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VoiceSelector from "./VoiceSelector";

const GRADIENT = "var(--gradient-brand)";

// The one review step. Every scene here is a real rendered clip with its own
// voiceover, and it is the SAME file that ends up in the finished video, so what
// plays in this grid is what ships. Approving does not render anything: it joins
// these clips end to end.
//
// There is deliberately no field editor. A scene is changed by saying what you
// want changed, because that is the only route that also re-cuts its voiceover and
// re-renders its clip; a form that edited the text alone would leave the clip
// showing the old words.
//
// Notes are written against as many scenes as you like and submitted together. The
// backend runs one job per session, so a batch is one job: the rewrites go out in
// parallel and the segments they invalidate are re-cut in a single pass, which is
// cheaper than one note at a time because neighbouring segments are shared.

const fmt = (s) => (Number.isFinite(s) ? `${Math.round(s * 10) / 10}s` : "");

/**
 * One scene. Shows its still until the clip exists, then plays the clip on click.
 *
 * The note lives in the step, not here: the header's "Rework N scenes" button has
 * to count the notes across every card, and a batch is submitted as one job. While
 * this card is in that batch it shows a spinner over its picture and keeps the note
 * visible, so the user can see what they asked for while it happens.
 *
 * Memoized because of that lift. The note now changes state one level up, so an
 * unmemoized card would re-render every sibling (and every sibling's video element)
 * on each keystroke.
 */
const SceneCard = memo(function SceneCard({ scene, index, still, busy, reworking, reworkLabel, note, onNoteChange }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  // A rework replaces the clip, so stop playing the one that is being replaced.
  useEffect(() => {
    if (reworking && videoRef.current) {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [reworking]);

  const ready = !!scene.clipUrl;
  const failed = scene.clipStatus === "failed";

  const play = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm flex flex-col"
    >
      <div className="relative aspect-video bg-surface-alt">
        {ready ? (
          <>
            <video
              ref={videoRef}
              src={scene.clipUrl}
              poster={still?.imageUrl || undefined}
              preload="metadata"
              playsInline
              className="w-full h-full object-cover"
              onEnded={() => setPlaying(false)}
              onClick={play}
            />
            {!playing && !reworking && (
              <button
                type="button"
                onClick={play}
                aria-label={`Play scene ${index + 1}`}
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors"
              >
                <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow">
                  <Play className="w-5 h-5 text-ink translate-x-[1px]" />
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full">
            {still?.imageUrl ? (
              <img src={still.imageUrl} alt={`Scene ${index + 1}`} className="w-full h-full object-cover opacity-60" />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted bg-white/60">
              {failed ? "This scene could not be rendered" : "Rendering…"}
            </div>
          </div>
        )}

        {reworking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 px-3 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--terra)]" />
            <span className="text-xs text-ink-muted">{reworkLabel || "Reworking…"}</span>
          </div>
        )}

        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          Scene {index + 1}
        </span>
      </div>

      <div className="p-3 space-y-2.5 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{scene.type}</span>
          <span className="text-[10px] text-ink-muted">{fmt(scene.clipSeconds ?? scene.seconds)}</span>
        </div>

        {scene.vo ? (
          <p className="text-sm text-ink italic">“{scene.vo}”</p>
        ) : (
          <p className="text-sm text-ink-muted">No voiceover on this beat.</p>
        )}

        {failed && scene.clipError ? (
          <p className="text-xs text-red-600 flex items-start gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {scene.clipError}
          </p>
        ) : null}

        <Textarea
          value={note}
          onChange={(e) => onNoteChange(index, e.target.value)}
          placeholder="What should change about this scene?"
          className="min-h-[72px] bg-white mt-auto"
          disabled={busy || reworking}
        />
      </div>
    </motion.div>
  );
});

export default function IntroSceneReviewStep({
  introScript,
  updateScriptField,
  saveScriptEdits,
  voiceId,
  setVoiceId,
  reviseScenes,
  approveAndGenerate,
  loading,
  reworkingIndexes = [],
  reworkLabel,
}) {
  const scenes = introScript?.scenes || [];
  const stills = introScript?.sceneFrames || [];
  const allReady = scenes.length > 0 && scenes.every((s) => s?.clipUrl);
  const pending = scenes.filter((s) => !s?.clipUrl).length;
  const totalSeconds = scenes.reduce((a, s) => a + (Number(s?.clipSeconds ?? s?.seconds) || 0), 0);

  // The notes live here rather than in the cards so the header can count them. A
  // batch is one job, so submitting is all-of-them-at-once and there is no per-card
  // button to get out of step with this.
  const [notes, setNotes] = useState({});
  // Stable identity, so the memo on SceneCard actually holds. An inline arrow here
  // would be a new prop every render and every card would re-render per keystroke,
  // which is the whole thing the memo exists to prevent.
  const setNote = useCallback((index, value) => {
    setNotes((prev) => ({ ...prev, [index]: value }));
  }, []);

  const reworking = reworkingIndexes.length > 0;
  const inFlight = new Set(reworkingIndexes);
  const pendingEdits = Object.entries(notes)
    .map(([i, note]) => ({ index: Number(i), note: (note || "").trim() }))
    .filter((e) => e.note);

  const submitRework = async () => {
    if (!pendingEdits.length) return;
    const { ok } = await reviseScenes(pendingEdits);
    // Clear only what landed. A scene that could not be changed keeps its note, so
    // the wording can be adjusted and resubmitted without retyping it.
    if (ok.length) {
      setNotes((prev) => {
        const next = { ...prev };
        for (const i of ok) delete next[i];
        return next;
      });
    }
  };

  // Play the scenes back to back for a rough sense of the whole thing. Not the
  // finished video (the browser cannot blend the transitions the way assembly
  // does), but enough to answer "does this hang together" without assembling.
  const [playAllAt, setPlayAllAt] = useState(-1);
  const playAllRef = useRef(null);
  useEffect(() => {
    if (playAllAt < 0) return;
    const el = playAllRef.current;
    if (el) el.play().catch(() => setPlayAllAt(-1));
  }, [playAllAt]);

  const [voiceOpen, setVoiceOpen] = useState(false);
  const changeVoice = (next) => {
    // Re-records every line and re-renders every scene, so it needs the job slot a
    // running rework is already holding.
    if (reworking) return;
    if (next === voiceId) return;
    const ok = window.confirm(
      `Changing the voice re-records every line and re-renders all ${scenes.length} scenes. That takes a few minutes. Continue?`
    );
    if (!ok) return;
    setVoiceId(next);
    saveScriptEdits({ voiceId: next });
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">
            {introScript?.businessName || "Brand Intro"}
          </h2>
          <p className="text-sm text-ink-muted">
            {scenes.length} scenes • ~{Math.round(totalSeconds)}s
            {pending ? ` • ${pending} still rendering` : " • ready"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allReady && (
            <Button variant="outline" onClick={() => setPlayAllAt(0)} disabled={loading || reworking}>
              <span className="flex items-center gap-2"><Play className="w-4 h-4" /> Play all</span>
            </Button>
          )}
          {(pendingEdits.length > 0 || reworking) && (
            <Button variant="outline" onClick={submitRework} disabled={loading || reworking || !pendingEdits.length}>
              <span className="flex items-center gap-2">
                {reworking
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
                {reworking
                  ? "Reworking…"
                  : `Rework ${pendingEdits.length} scene${pendingEdits.length > 1 ? "s" : ""}`}
              </span>
            </Button>
          )}
          <Button
            onClick={approveAndGenerate}
            disabled={loading || reworking || !allReady}
            className="text-white border-0"
            style={{ background: GRADIENT }}
            title={allReady ? undefined : "Every scene has to finish rendering first"}
          >
            {loading ? "Working…" : (
              <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Approve &amp; Generate</span>
            )}
          </Button>
        </div>
      </div>

      {/* Step-level settings: everything that is a property of the whole video
          rather than of one scene. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 block">Brand name</label>
          <Input
            value={introScript?.businessName || ""}
            onChange={(e) => updateScriptField("businessName", e.target.value)}
            onBlur={() => saveScriptEdits()}
            disabled={loading}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 flex items-center gap-1">
            <Music className="w-3.5 h-3.5" /> Background music
          </label>
          <Input
            value={introScript?.musicPrompt || ""}
            onChange={(e) => updateScriptField("musicPrompt", e.target.value)}
            onBlur={() => saveScriptEdits()}
            disabled={loading}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1 flex items-center gap-1">
            <Mic className="w-3.5 h-3.5" /> Voice
          </label>
          <Button variant="outline" className="w-full justify-start" onClick={() => setVoiceOpen((v) => !v)} disabled={loading || reworking}>
            {voiceId || "Pick a voice"}
          </Button>
        </div>
      </div>

      {voiceOpen && (
        <div className="mb-4 p-3 rounded-2xl border border-border bg-surface-alt">
          <p className="text-xs text-ink-muted mb-2">
            The voice is recorded into every scene, so changing it re-renders all of them.
          </p>
          <VoiceSelector value={voiceId} onChange={changeVoice} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scenes.map((scene, index) => (
            <SceneCard
              key={index}
              scene={scene}
              index={index}
              still={stills[index]}
              busy={loading}
              reworking={inFlight.has(index)}
              reworkLabel={inFlight.has(index) ? reworkLabel : ""}
              note={notes[index] || ""}
              onNoteChange={setNote}
            />
          ))}
        </div>
      </div>

      {playAllAt >= 0 && scenes[playAllAt]?.clipUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setPlayAllAt(-1)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <video
              ref={playAllRef}
              key={playAllAt}
              src={scenes[playAllAt].clipUrl}
              autoPlay
              playsInline
              className="w-full rounded-2xl"
              onEnded={() => setPlayAllAt((i) => (i + 1 < scenes.length ? i + 1 : -1))}
            />
            <p className="text-white/70 text-sm mt-2 text-center">
              Scene {playAllAt + 1} of {scenes.length} • click anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
