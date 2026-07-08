import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Volume2, RefreshCw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVoiceOptionLabel } from "@/lib/voiceMetadata";
import { getVoices } from "@/services/voices";

export default function NarrationEditModal({
  section,
  currentVoiceId,
  onClose,
  onSave,
  onRegenerateNarration,
}) {
  // The voice is stored on the Video (currentVoiceId), not per-section, so default
  // to it - otherwise editing narration always reset the voice to "adam".
  const initialVoiceId = section?.voiceId || currentVoiceId || "adam";
  const [narrationText, setNarrationText] = useState(section?.narrationText || "");
  const [voiceId, setVoiceId] = useState(initialVoiceId);
  const [voices, setVoices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement] = useState(() => new Audio());

  // Load voices
  useEffect(() => {
    async function loadVoices() {
      try {
        const voiceList = await getVoices();
        setVoices(voiceList);
      } catch (err) {
        console.error("Failed to load voices:", err);
      }
    }
    loadVoices();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioElement.pause();
      audioElement.src = "";
    };
  }, [audioElement]);

  // Handle audio playback
  const togglePlayback = () => {
    if (!section?.narrationUrl) return;

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.src = section.narrationUrl;
      audioElement.play();
      setIsPlaying(true);
      audioElement.onended = () => setIsPlaying(false);
    }
  };

  const handleSave = async () => {
    console.log("[NarrationEditModal] handleSave called");
    console.log("[NarrationEditModal] hasChanges:", hasChanges);
    console.log("[NarrationEditModal] onRegenerateNarration exists:", !!onRegenerateNarration);

    setSaving(true);
    try {
      // If text or voice changed, regenerate the TTS audio instead of just saving text
      if (hasChanges && onRegenerateNarration) {
        console.log("[NarrationEditModal] Changes detected, calling onRegenerateNarration from save");
        await onRegenerateNarration(section.id, narrationText, voiceId);
        console.log("[NarrationEditModal] onRegenerateNarration from save completed");
      } else {
        console.log("[NarrationEditModal] No changes or no regenerate handler, calling onSave");
        await onSave({
          narrationText,
          voiceId,
        });
      }
      onClose();
    } catch (err) {
      console.error("[NarrationEditModal] handleSave failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    console.log("[NarrationEditModal] handleRegenerate called");
    console.log("[NarrationEditModal] onRegenerateNarration exists:", !!onRegenerateNarration);
    console.log("[NarrationEditModal] section.id:", section?.id);
    console.log("[NarrationEditModal] narrationText:", narrationText);
    console.log("[NarrationEditModal] voiceId:", voiceId);
    console.log("[NarrationEditModal] hasChanges:", hasChanges);

    if (!onRegenerateNarration) {
      console.warn("[NarrationEditModal] onRegenerateNarration is not provided, returning early");
      return;
    }

    setRegenerating(true);
    try {
      console.log("[NarrationEditModal] Calling onRegenerateNarration...");
      await onRegenerateNarration(section.id, narrationText, voiceId);
      console.log("[NarrationEditModal] onRegenerateNarration completed successfully");
      onClose();
    } catch (err) {
      console.error("[NarrationEditModal] onRegenerateNarration failed:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const hasChanges =
    narrationText !== (section?.narrationText || "") || voiceId !== initialVoiceId;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card rounded-xl w-full max-w-lg p-4 md:p-6 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Edit Narration
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current audio playback */}
          {section?.narrationUrl && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 flex items-center gap-3">
              <button
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-white"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
              <div className="flex-1">
                <p className="text-sm text-foreground">Current Narration</p>
                <p className="text-xs text-muted-foreground">
                  Clip {(section.orderIndex || 0) + 1}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Narration Text */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Narration Text
              </label>
              <textarea
                value={narrationText}
                onChange={(e) => setNarrationText(e.target.value)}
                placeholder="Enter the narration text..."
                rows={4}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {narrationText.length} characters
              </p>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Voice</label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
              >
                {voices.map((voice) => (
                  <option key={voice.key || voice.id} value={voice.key || voice.id}>
                    {getVoiceOptionLabel(voice)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-3 mt-6">
            <Button
              onClick={handleRegenerate}
              disabled={!hasChanges || regenerating || saving}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Audio
                </>
              )}
            </Button>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose} disabled={saving || regenerating}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || regenerating}
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
