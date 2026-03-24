import { motion } from 'framer-motion';
import VoiceSelector from './VoiceSelector';

export default function VoiceConfigStep({
  voiceId,
  setVoiceId,
  backgroundMusic,
  setBackgroundMusic,
  sceneFrames,
  onStartGeneration,
  loading,
  insufficientCredits,
}) {
  const clipCount = sceneFrames?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Voice & Music</h2>
        <p className="text-white/60">Choose a voice for narration and enable background music.</p>
      </div>

      {/* Voice Selector */}
      <div className="border border-white/10 rounded-xl p-5 bg-white/5">
        <h3 className="text-lg font-medium text-white mb-3">Narration Voice</h3>
        <VoiceSelector selectedVoice={voiceId} onSelectVoice={setVoiceId} />
      </div>

      {/* Background Music */}
      <div className="border border-white/10 rounded-xl p-5 bg-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Background Music</h3>
            <p className="text-white/50 text-sm">AI-generated music to match your video</p>
          </div>
          <button
            onClick={() => setBackgroundMusic(!backgroundMusic)}
            className={`relative w-12 h-6 rounded-full transition-colors ${backgroundMusic ? 'bg-blue-600' : 'bg-white/20'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${backgroundMusic ? 'left-7' : 'left-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-lg font-medium text-white mb-2">Generation Summary</h3>
        <ul className="text-white/60 text-sm space-y-1">
          <li>{clipCount} scene frames will be animated to video (5s each)</li>
          <li>Narration will be generated for all scenes</li>
          {backgroundMusic && <li>Background music will be generated</li>}
          <li>Final video will be assembled automatically</li>
        </ul>
        <p className="text-white/40 text-xs mt-3">Cost: {clipCount} credits</p>
      </div>

      {/* Generate Button */}
      <button
        onClick={onStartGeneration}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
      >
        {loading ? 'Starting Generation...' : `Generate Video (${clipCount} credits)`}
      </button>
    </motion.div>
  );
}
