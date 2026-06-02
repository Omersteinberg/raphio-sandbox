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
    <div className="h-full overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Voice & Music</h2>
          <p className="text-gray-500">Choose a voice for narration and enable background music.</p>
        </div>

        {/* Voice Selector */}
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Narration Voice</h3>
          <VoiceSelector value={voiceId} onChange={setVoiceId} />
        </div>

        {/* Background Music */}
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Background Music</h3>
              <p className="text-gray-500 text-sm">AI-generated music to match your video</p>
            </div>
            <button
              onClick={() => setBackgroundMusic(!backgroundMusic)}
              className={`relative w-12 h-6 rounded-full transition-colors ${backgroundMusic ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${backgroundMusic ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generation Summary</h3>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>{clipCount} scene frames will be animated to video (5s each)</li>
            <li>Narration will be generated for all scenes</li>
            {backgroundMusic && <li>Background music will be generated</li>}
            <li>Final video will be assembled automatically</li>
          </ul>
          <p className="text-gray-400 text-xs mt-3">Cost: {clipCount} credits ({clipCount} clips × $5)</p>
        </div>

        {/* Generate Button */}
        <button
          onClick={onStartGeneration}
          disabled={loading}
          className="w-full disabled:opacity-50 text-white font-medium py-3 rounded-xl"
          style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
        >
          {loading ? 'Starting Generation...' : `Generate Video (${clipCount} credits)`}
        </button>
      </motion.div>
    </div>
  );
}
