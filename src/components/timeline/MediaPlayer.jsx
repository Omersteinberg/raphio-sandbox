import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

function formatTime(seconds) {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * A single-source media player styled with the editor's own controls, for
 * the modals that show a clip or track outside the timeline (Regenerate Clip,
 * Regenerate Music, Edit Narration).
 *
 * This is deliberately NOT VideoPreview. That component stacks one <video>
 * per timeline clip and is driven by the timeline playhead, registering its
 * elements with useTimeline - it plays "the timeline", not "a URL". What IS
 * shared with it is the chrome, which is the whole point: the same
 * `.range-terra` / `.range-terra-on-media` seek slider, the same bottom
 * gradient overlay bar, the same `.editor-screen` frame, the same white
 * icon-button treatment. So a clip previewed in a modal reads as the same
 * player the user just left, instead of the browser's native <video controls>
 * (default play triangle, native scrubber, the "⋮" kebab) dropped into an
 * otherwise designed surface.
 *
 * `kind="video"`: framed screen with the overlay bar (play / time / seek /
 * mute / fullscreen).
 * `kind="audio"`: a compact row (play / seek / time) on the light surface -
 * enough to not look native, without pretending a waveform is a picture.
 */
export default function MediaPlayer({ src, kind = "video", poster, label, className = "" }) {
  const mediaRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset when the source changes (the same modal can be reopened on a
  // different clip without remounting this component).
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  // Every state read comes from the element itself, so the UI can never drift
  // from what the browser is actually doing (e.g. autoplay policy pausing it).
  const onLoadedMetadata = useCallback(() => setDuration(mediaRef.current?.duration || 0), []);
  const onTimeUpdate = useCallback(() => setCurrentTime(mediaRef.current?.currentTime || 0), []);
  const onPlay = useCallback(() => setPlaying(true), []);
  const onPause = useCallback(() => setPlaying(false), []);
  const onEnded = useCallback(() => setPlaying(false), []);

  const togglePlay = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const seek = (t) => {
    const el = mediaRef.current;
    if (!el) return;
    try { el.currentTime = t; } catch { /* not seekable yet */ }
    setCurrentTime(t);
  };

  const toggleMute = () => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const fullscreen = () => mediaRef.current?.requestFullscreen?.().catch(() => {});

  const progress = duration > 0 ? (Math.min(currentTime, duration) / duration) * 100 : 0;

  const mediaEvents = {
    onLoadedMetadata,
    onTimeUpdate,
    onPlay,
    onPause,
    onEnded,
  };

  if (kind === "audio") {
    return (
      <div className={`flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3 ${className}`}>
        <audio ref={mediaRef} src={src} preload="metadata" {...mediaEvents} />
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center hover:bg-terra-dark transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          {label && <p className="text-xs font-medium text-foreground truncate mb-1">{label}</p>}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              className="flex-1 range-terra"
              style={{ "--range-progress": `${progress}%` }}
            />
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video rounded-xl border border-border bg-muted overflow-hidden editor-screen ${className}`}>
      <video
        ref={mediaRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        className="absolute inset-0 w-full h-full object-contain bg-black"
        onClick={togglePlay}
        {...mediaEvents}
      />
      {/* Same overlay bar as the main preview: bottom-anchored gradient scrim,
          always visible (touch has no hover). */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 pb-2 pt-8 bg-gradient-to-t from-black/75 via-black/45 to-transparent">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="text-white/90 hover:text-white p-1 shrink-0 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <span className="text-[11px] text-white/80 tabular-nums shrink-0 drop-shadow">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="flex-1 range-terra range-terra-on-media"
          style={{ "--range-progress": `${progress}%` }}
        />
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="text-white/90 hover:text-white p-1 shrink-0 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={fullscreen}
          aria-label="Fullscreen"
          className="text-white/90 hover:text-white p-1 shrink-0 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
