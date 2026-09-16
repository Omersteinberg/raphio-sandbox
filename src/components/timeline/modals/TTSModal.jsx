import { useState, useEffect } from "react";
import { Loader2, Volume2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getVoiceOptionLabel } from "@/lib/voiceMetadata";
import { getVoices } from "@/services/voices";
import EditorModalShell from "./EditorModalShell";

export default function TTSModal({ onClose, onGenerate, onComplete }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("adam");
  const [voices, setVoices] = useState([]);
  const [generating, setGenerating] = useState(false);

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

  const handleGenerate = async () => {
    if (!text.trim()) return;

    setGenerating(true);
    try {
      const asset = await onGenerate(text, voiceId, name || undefined);
      if (asset) {
        onComplete(asset);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <EditorModalShell
      icon={Volume2}
      title="Generate Text-to-Speech"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!text.trim() || generating}
            className="text-white border-0"
            style={{ background: "var(--gradient-brand)" }}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </div>
      }
    >
          {/* Form - Input/Textarea (the shared primitives), not the raw
              unstyled <input>/<textarea> this used to render, matching
              NarrationEditModal's form styling. */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="tts-name" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Name (optional)
              </label>
              <Input
                id="tts-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Intro Narration"
                className="text-sm focus-visible:border-ring"
              />
            </div>

            {/* Text */}
            <div>
              <label htmlFor="tts-text" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Text to speak
              </label>
              <Textarea
                id="tts-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the text you want to convert to speech…"
                rows={4}
                className="text-sm focus-visible:border-ring"
              />
              <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
                {text.length} characters
              </p>
            </div>

            {/* Voice - same custom-styled select + chevron as NarrationEditModal,
                instead of the browser's native select chrome. */}
            <div>
              <label htmlFor="tts-voice" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Voice
              </label>
              <div className="relative">
                <select
                  id="tts-voice"
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
          </div>
    </EditorModalShell>
  );
}
