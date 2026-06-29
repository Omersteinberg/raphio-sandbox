import { motion } from 'framer-motion';
import VoiceSelector from './VoiceSelector';
import { creditsForDuration } from '@/lib/limits';

export default function VoiceConfigStep({
  voiceId,
  setVoiceId,
  backgroundMusic,
  setBackgroundMusic,
  sceneFrames,
  targetDuration,
  onStartGeneration,
  loading,
  insufficientCredits,
}) {
  const clipCount = sceneFrames?.length || 0;
  // Cost is priced by the selected video duration, not the clip count.
  const totalCredits = creditsForDuration(targetDuration);

  return (
    <div className="h-full overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-ink mb-2">Voice & Music</h2>
          <p className="text-ink-muted">Choose a voice for narration and enable background music.</p>
        </div>

        {/* Voice Selector */}
        <div className="border border-border rounded-xl p-5 bg-surface-alt">
          <h3 className="text-lg font-medium text-ink mb-3">Narration Voice</h3>
          <VoiceSelector value={voiceId} onChange={setVoiceId} />
        </div>

        {/* Background Music */}
        <div className="border border-border rounded-xl p-5 bg-surface-alt">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-ink">Background Music</h3>
              <p className="text-ink-muted text-sm">AI-generated music to match your video</p>
            </div>
            <button
              onClick={() => setBackgroundMusic(!backgroundMusic)}
              className={`relative w-12 h-6 rounded-full transition-colors ${backgroundMusic ? 'bg-terra' : 'bg-ink/20'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${backgroundMusic ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-surface-alt border border-border rounded-xl p-5">
          <h3 className="text-lg font-medium text-ink mb-2">Generation Summary</h3>
          <ul className="text-ink-muted text-sm space-y-1">
            <li>{clipCount} {clipCount === 1 ? 'scene' : 'scenes'} will be generated from your scene frames</li>
            <li>Narration will be generated for all scenes</li>
            {backgroundMusic && <li>Background music will be generated</li>}
            <li>Final video will be assembled automatically</li>
          </ul>
          <p className="text-ink-muted text-xs mt-3">Cost: {totalCredits} {totalCredits === 1 ? 'credit' : 'credits'} for your {targetDuration}s video (based on length, not clip count)</p>
        </div>

        {/* Generate Button */}
        <button
          onClick={onStartGeneration}
          disabled={loading}
          className="w-full disabled:opacity-50 text-white font-medium py-3 rounded-xl"
          style={{ background: "var(--gradient-brand)" }}
        >
          {loading ? 'Starting Generation...' : `Generate Video (${totalCredits} credits)`}
        </button>
      </motion.div>
    </div>
  );
}
