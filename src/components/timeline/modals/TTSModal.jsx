import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVoiceOptionLabel } from "@/lib/voiceMetadata";
import { getVoices } from "@/services/voices";

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
              <Volume2 className="w-5 h-5 text-terra" />
              <h3 className="text-lg font-semibold text-white">
                Generate Text-to-Speech
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Intro Narration"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-terra"
              />
            </div>

            {/* Text */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Text to speak
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the text you want to convert to speech..."
                rows={4}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-terra resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {text.length} characters
              </p>
            </div>

            {/* Voice */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Voice</label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-terra"
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
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-foreground"
            >
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
