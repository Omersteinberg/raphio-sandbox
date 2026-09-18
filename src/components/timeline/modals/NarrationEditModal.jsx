import { useState, useEffect } from "react";
import { Loader2, Mic, RefreshCw, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getVoiceOptionLabel } from "@/lib/voiceMetadata";
import { getVoices } from "@/services/voices";
import { NARRATION_TONES, DEFAULT_TONE } from "@/constants/narrationTones";
import MediaPlayer from "../MediaPlayer";
import EditorModalShell from "./EditorModalShell";

/**
 * Edit a clip's narration text, voice and tone, and save or regenerate the
 * audio. Deliberately a modal, not the expandable clip pill: a long text field
 * plus a voice list plus a tone chip row is real content, and the pill is
 * reserved for the slider-only controls (Speed / Volume) that fit beside a
 * clip.
 */
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
  // Tone IS stored per-section (VideoSection.narrationTone). A section that predates
  // the column comes back null, which reads as neutral, i.e. how it already sounds.
  const initialTone = section?.narrationTone || DEFAULT_TONE;
  const [narrationText, setNarrationText] = useState(section?.narrationText || "");
  const [voiceId, setVoiceId] = useState(initialVoiceId);
  const [tone, setTone] = useState(initialTone);
  const [voices, setVoices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      // If text or voice changed, regenerate the TTS audio instead of just saving text
      if (hasChanges && onRegenerateNarration) {
        await onRegenerateNarration(section.id, narrationText, voiceId, tone);
      } else {
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
    if (!onRegenerateNarration) return;

    setRegenerating(true);
    try {
      await onRegenerateNarration(section.id, narrationText, voiceId, tone);
      onClose();
    } catch (err) {
      console.error("[NarrationEditModal] onRegenerateNarration failed:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const hasChanges =
    narrationText !== (section?.narrationText || "") ||
    voiceId !== initialVoiceId ||
    tone !== initialTone;

  const busy = saving || regenerating;

  return (
    <EditorModalShell
      icon={Mic}
      title="Edit Narration"
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={handleRegenerate}
            disabled={!hasChanges || busy}
            className="px-4 py-2 rounded-lg border border-primary text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {regenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate Audio
              </>
            )}
          </button>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ background: "var(--gradient-brand)" }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      }
    >
          {/* Current narration - the editor's compact audio player. Replaces a
              one-off play button that had no scrubber and no time readout. */}
          {section?.narrationUrl && (
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Current narration</p>
              <MediaPlayer
                kind="audio"
                src={section.narrationUrl}
                label={`Clip ${(section.orderIndex || 0) + 1}`}
              />
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">
            {/* Narration Text */}
            <div>
              <label htmlFor="narration-text" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Narration text
              </label>
              <Textarea
                id="narration-text"
                value={narrationText}
                onChange={(e) => setNarrationText(e.target.value)}
                placeholder="Enter the narration text…"
                rows={4}
                className="text-sm focus-visible:border-ring"
              />
              <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
                {narrationText.length} characters
              </p>
            </div>

            {/* Voice Selection. Styled to match the shadcn Input primitive
                (h-9, rounded-md, border-input, bg-card, terracotta focus ring)
                rather than the browser's native select chrome; appearance-none
                plus an explicit chevron so it reads as one of ours. */}
            <div>
              <label htmlFor="narration-voice" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Voice
              </label>
              <div className="relative">
                <select
                  id="narration-voice"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="appearance-none h-9 w-full rounded-md border border-input bg-card pl-3 pr-9 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {voices.map((voice) => (
                    <option key={voice.key || voice.id} value={voice.key || voice.id}>
                      {getVoiceOptionLabel(voice)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Tone. A chip row rather than a select: there are only eight, and
                the choice is worth seeing all at once so the user can compare.
                Styled as the editor's established selectable-option pattern
                (the Speed / Volume presets, the Cut / Crossfade pair): a
                bordered rounded-lg chip with a terracotta outline + wash when
                active - not a filled white-on-terracotta pill, which spent the
                accent on a state indicator rather than an action. */}
            <div>
              <p className="block text-xs font-medium text-muted-foreground mb-2" id="narration-tone-label">
                Tone
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="narration-tone-label">
                {NARRATION_TONES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTone(t.key)}
                    aria-pressed={tone === t.key}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      tone === t.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Changes how the line is delivered. Applied when you regenerate the audio.
              </p>
            </div>
          </div>
    </EditorModalShell>
  );
}
