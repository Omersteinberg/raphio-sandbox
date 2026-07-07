import { motion } from 'framer-motion';
import { Mic, Music } from 'lucide-react';
import { creditsForDuration } from '@/lib/limits';

// Voice and background music are now chosen up front on the prompt step, so this
// step is a final review + the "generate" action. It shows a read-only summary
// of those choices for confidence.
export default function VoiceConfigStep({
  voiceId,
  backgroundMusic,
  sceneFrames,
  targetDuration,
  onStartGeneration,
  loading,
}) {
  const clipCount = sceneFrames?.length || 0;
  // Cost is priced by the selected video duration, not the clip count.
  const totalCredits = creditsForDuration(targetDuration);
  const voiceLabel = voiceId
    ? voiceId.charAt(0).toUpperCase() + voiceId.slice(1)
    : 'Default voice';

  return (
    <div className="h-full overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-ink mb-2">Review &amp; Generate</h2>
          <p className="text-ink-muted">Confirm your settings and start generating your video.</p>
        </div>

        {/* Sound summary (chosen on the first step) */}
        <div className="border border-border rounded-xl bg-surface-alt overflow-hidden">
          <div className="flex items-center gap-3 p-5">
            <div className="w-10 h-10 rounded-lg bg-terra/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-terra" />
            </div>
            <div>
              <p className="font-medium text-ink">Narration Voice</p>
              <p className="text-sm text-ink-muted">{voiceLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5 border-t border-border">
            <div className="w-10 h-10 rounded-lg bg-terra/10 flex items-center justify-center">
              <Music className="w-5 h-5 text-terra" />
            </div>
            <div>
              <p className="font-medium text-ink">Background Music</p>
              <p className="text-sm text-ink-muted">
                {backgroundMusic ? 'AI-generated music to match your video' : 'No background music'}
              </p>
            </div>
          </div>
          <p className="px-5 pb-4 text-xs text-ink-muted">
            Voice and music are chosen on the first step. Go back if you want to change them.
          </p>
        </div>

        {/* Summary */}
        <div className="bg-surface-alt border border-border rounded-xl p-5">
          <h3 className="text-lg font-medium text-ink mb-2">Generation Summary</h3>
          <ul className="text-ink-muted text-sm space-y-1 list-disc list-inside">
            <li>{clipCount} {clipCount === 1 ? 'scene' : 'scenes'} will be generated from your scene frames</li>
            <li>Narration will be generated for all scenes</li>
            {backgroundMusic && <li>Background music will be generated</li>}
            <li>Final video will be assembled automatically</li>
          </ul>
          <p className="text-ink-muted text-xs mt-3">Your {targetDuration}s video is covered by the {totalCredits} {totalCredits === 1 ? 'credit' : 'credits'} already charged. Generating costs nothing extra.</p>
        </div>

        {/* Generate Button */}
        <button
          onClick={onStartGeneration}
          disabled={loading}
          className="w-full disabled:opacity-50 text-white font-medium py-3 rounded-xl"
          style={{ background: "var(--gradient-brand)" }}
        >
          {loading ? 'Starting Generation...' : 'Generate Video'}
        </button>
      </motion.div>
    </div>
  );
}
