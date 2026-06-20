import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Film, Music, Gauge, Volume2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ItemEditModal({
  item,
  section,
  audioAsset,
  onClose,
  onSave,
}) {
  const [trimStart, setTrimStart] = useState(item.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(item.trimEnd || item.duration);
  const [speed, setSpeed] = useState(item.speed || 1);
  const [volume, setVolume] = useState(item.volume || 1);
  const [saving, setSaving] = useState(false);

  const isVideo = item.trackType === "VIDEO";
  const label = isVideo
    ? section?.narrationText?.substring(0, 50) || "Video Clip"
    : audioAsset?.name || section?.narrationText?.substring(0, 50) || "Audio";

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        trimStart,
        speed,
      };

      if (!isVideo) {
        updates.volume = volume;
      }

      if (trimEnd !== item.duration) {
        updates.trimEnd = trimEnd;
      }

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
          className="bg-card rounded-lg w-full max-w-md p-6"
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
              <h3 className="text-lg font-semibold text-white">Edit Item</h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Item info */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-white truncate">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Duration: {item.duration.toFixed(1)}s | Start: {item.startTime.toFixed(1)}s
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Trim Start */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                Trim Start (seconds)
              </label>
              <input
                type="range"
                min={0}
                max={item.duration}
                step={0.1}
                value={trimStart}
                onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0s</span>
                <span className="text-white">{trimStart.toFixed(1)}s</span>
                <span>{item.duration.toFixed(1)}s</span>
              </div>
            </div>

            {/* Trim End */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                Trim End (seconds)
              </label>
              <input
                type="range"
                min={trimStart + 0.5}
                max={item.duration + (item.trimStart || 0)}
                step={0.1}
                value={trimEnd}
                onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{(trimStart + 0.5).toFixed(1)}s</span>
                <span className="text-white">{trimEnd.toFixed(1)}s</span>
                <span>{(item.duration + (item.trimStart || 0)).toFixed(1)}s</span>
              </div>
            </div>

            {/* Speed */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Gauge className="w-4 h-4" />
                Speed
              </label>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.25}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0.25x</span>
                <span className="text-white">{speed}x</span>
                <span>4x</span>
              </div>
            </div>

            {/* Volume (audio only) */}
            {!isVideo && (
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Volume2 className="w-4 h-4" />
                  Volume
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="text-white">{Math.round(volume * 100)}%</span>
                  <span>200%</span>
                </div>
              </div>
            )}
          </div>

          {/* Presets */}
          <div className="mt-4">
            <label className="block text-sm text-muted-foreground mb-2">
              Speed Presets
            </label>
            <div className="flex gap-2">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSpeed(preset)}
                  className={`px-3 py-1 rounded text-sm ${
                    speed === preset
                      ? "bg-terra text-white"
                      : "bg-muted text-foreground hover:bg-muted"
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-white border-0"
              style={{ background: "var(--gradient-brand)" }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
