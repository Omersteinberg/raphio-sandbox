import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Film, Music, Play, Pause, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeTrim } from "@/lib/timelineTrim";

const MIN_DURATION = 0.5;

// Resolve the underlying source length for the clip being trimmed.
function getSourceDuration(item, section, audioAsset) {
  let raw;
  if (item.trackType === "VIDEO") {
    raw = section?.clipDuration;
  } else if (audioAsset) {
    raw = audioAsset.duration;
  } else if (section) {
    raw = section.narrationDuration ?? section.clipDuration;
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  // Fall back to the current trimmed extent if source length is unknown.
  return (item.trimStart || 0) + (item.duration || MIN_DURATION);
}

export default function ItemEditModal({ item, section, audioAsset, onClose, onSave }) {
  const isVideo = item.trackType === "VIDEO";

  const sourceDuration = useMemo(
    () => getSourceDuration(item, section, audioAsset),
    [item, section, audioAsset]
  );

  // In/Out points within the source (seconds).
  const [trimStart, setTrimStart] = useState(() =>
    Math.min(item.trimStart || 0, sourceDuration - MIN_DURATION)
  );
  const [trimEnd, setTrimEnd] = useState(() =>
    Math.min(item.trimEnd ?? (item.trimStart || 0) + item.duration, sourceDuration)
  );
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const mediaRef = useRef(null);

  const mediaUrl = isVideo
    ? section?.generatedClipUrl
    : audioAsset?.url || section?.narrationUrl;

  const label = isVideo
    ? section?.narrationText?.substring(0, 50) || "Video clip"
    : audioAsset?.name || section?.narrationText?.substring(0, 50) || "Audio";

  const waveform = Array.isArray(audioAsset?.waveformData) ? audioAsset.waveformData : null;

  const keptDuration = Math.max(0, trimEnd - trimStart);
  const pct = (t) => `${(t / sourceDuration) * 100}%`;

  // Clamp helpers keep In/Out valid as either handle moves.
  const updateIn = (value) => {
    const next = Math.min(Math.max(0, value), trimEnd - MIN_DURATION);
    setTrimStart(next);
  };
  const updateOut = (value) => {
    const next = Math.max(Math.min(sourceDuration, value), trimStart + MIN_DURATION);
    setTrimEnd(next);
  };

  // Preview plays only the kept In -> Out region, then stops.
  const togglePreview = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (previewing) {
      el.pause();
      setPreviewing(false);
      return;
    }
    el.currentTime = trimStart;
    el.volume = item.volume ?? 1;
    el.play().then(() => setPreviewing(true)).catch(() => {});
  };

  // Stop preview at the Out point.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.currentTime >= trimEnd) {
        el.pause();
        setPreviewing(false);
      }
    };
    const onEnded = () => setPreviewing(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, [trimEnd]);

  // Stop any preview playback when the modal unmounts.
  useEffect(() => {
    return () => {
      if (mediaRef.current) mediaRef.current.pause();
    };
  }, []);

  const handleApply = async () => {
    setSaving(true);
    try {
      const trim = computeTrim({ trimStart, trimEnd, sourceDuration, minDuration: MIN_DURATION });
      const updates = {
        trimStart: trim.trimStart,
        trimEnd: trim.trimEnd,
        duration: trim.duration,
        speed: 1.0,
      };
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card rounded-lg w-full max-w-lg p-6"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isVideo ? (
                <Film className="w-5 h-5 text-terra" />
              ) : (
                <Music className="w-5 h-5 text-blue-400" />
              )}
              <h3 className="text-lg font-semibold text-white">Trim clip</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-white truncate">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Source length: {sourceDuration.toFixed(1)}s
            </p>
          </div>

          {/* Preview media (hidden audio / shown video) */}
          {mediaUrl && (
            isVideo ? (
              <video
                ref={mediaRef}
                src={mediaUrl}
                className="w-full max-h-56 rounded-lg bg-black object-contain mb-3"
                playsInline
              />
            ) : (
              <audio ref={mediaRef} src={mediaUrl} className="hidden" />
            )
          )}

          {/* Trim track: shaded = removed, highlighted = kept */}
          <div className="mb-2">
            <div className="relative h-14 rounded-md bg-muted/40 overflow-hidden border border-border">
              {/* Waveform (audio) */}
              {waveform && (
                <div className="absolute inset-0 flex items-center gap-px px-1 opacity-60">
                  {waveform.map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-400/70 rounded-sm"
                      style={{ height: `${Math.max(4, Math.min(100, Number(v) * 100))}%` }}
                    />
                  ))}
                </div>
              )}
              {/* Removed head */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-black/55"
                style={{ width: pct(trimStart) }}
              />
              {/* Removed tail */}
              <div
                className="absolute top-0 bottom-0 right-0 bg-black/55"
                style={{ width: pct(sourceDuration - trimEnd) }}
              />
              {/* Kept region outline */}
              <div
                className="absolute top-0 bottom-0 border-2 border-terra bg-terra/10"
                style={{ left: pct(trimStart), width: pct(keptDuration) }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0s</span>
              <span className="text-terra">
                <Scissors className="w-3 h-3 inline mr-1" />
                keeping {keptDuration.toFixed(1)}s
              </span>
              <span>{sourceDuration.toFixed(1)}s</span>
            </div>
          </div>

          {/* In / Out controls */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Start (in)</label>
              <input
                type="range"
                min={0}
                max={sourceDuration}
                step={0.1}
                value={trimStart}
                onChange={(e) => updateIn(parseFloat(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min={0}
                max={sourceDuration}
                step={0.1}
                value={Number(trimStart.toFixed(2))}
                onChange={(e) => updateIn(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-muted text-white text-sm rounded px-2 py-1 border border-border"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">End (out)</label>
              <input
                type="range"
                min={0}
                max={sourceDuration}
                step={0.1}
                value={trimEnd}
                onChange={(e) => updateOut(parseFloat(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min={0}
                max={sourceDuration}
                step={0.1}
                value={Number(trimEnd.toFixed(2))}
                onChange={(e) => updateOut(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-muted text-white text-sm rounded px-2 py-1 border border-border"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={togglePreview}
              disabled={!mediaUrl}
              className="text-foreground"
            >
              {previewing ? (
                <>
                  <Pause className="w-4 h-4 mr-2" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Preview cut
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="text-foreground">
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={saving}
                className="text-white border-0"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply cut"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
