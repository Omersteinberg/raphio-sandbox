import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FrameGenerationStep({
  sceneFrames,
  scriptData,
  framesLoading,
  onRegenerate,
  onApprove,
  onDelete,
  onGenerateFrames,
  error,
}) {
  const [feedbackByIndex, setFeedbackByIndex] = useState({});
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);

  const handleRegenerate = async (index) => {
    setRegeneratingIndex(index);
    await onRegenerate(index, feedbackByIndex[index] || '');
    setFeedbackByIndex(prev => ({ ...prev, [index]: '' }));
    setRegeneratingIndex(null);
  };

  const allFramesComplete = sceneFrames.length > 0 && sceneFrames.every(f => f.status === 'completed');

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Scene Frames</h2>
        <p className="text-white/60">
          Review the generated frames for your story. Regenerate any frame with feedback or approve all to continue.
        </p>
      </div>

      {/* Generate button if no frames yet */}
      {sceneFrames.length === 0 && !framesLoading && (
        <button
          onClick={() => onGenerateFrames()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Generate Scene Frames
        </button>
      )}

      {/* Loading state */}
      {framesLoading && sceneFrames.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-white/50">Generating scene frames...</p>
        </div>
      )}

      {/* Frame Grid */}
      {sceneFrames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sceneFrames.map((frame, index) => {
            const section = scriptData?.sections?.[index];
            return (
              <div
                key={index}
                className="border border-white/10 rounded-xl overflow-hidden bg-white/5"
              >
                {/* Image */}
                <div className="aspect-video bg-black/20 relative">
                  {frame.status === 'completed' && frame.imageUrl ? (
                    <img
                      src={frame.imageUrl}
                      alt={`Scene ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : frame.status === 'failed' ? (
                    <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">
                      Failed to generate
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {/* Scene number badge */}
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    Scene {index + 1}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  {section && (
                    <>
                      <p className="text-white/80 text-sm line-clamp-2">{section.narrationText}</p>
                      {section.characters?.length > 0 && (
                        <div className="flex gap-1">
                          {section.characters.map((c) => (
                            <span key={c} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Feedback + Actions */}
                  {frame.status === 'completed' && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={feedbackByIndex[index] || ''}
                        onChange={(e) => setFeedbackByIndex(prev => ({ ...prev, [index]: e.target.value }))}
                        placeholder="Feedback for regeneration..."
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs placeholder-white/30 focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRegenerate(index)}
                          disabled={regeneratingIndex === index}
                          className="flex-1 text-xs bg-white/10 hover:bg-white/20 text-white py-1.5 rounded transition-colors disabled:opacity-50"
                        >
                          {regeneratingIndex === index ? 'Regenerating...' : 'Regenerate'}
                        </button>
                        <button
                          onClick={() => onDelete(index)}
                          disabled={sceneFrames.length <= 2}
                          className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded transition-colors disabled:opacity-30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Scene note */}
      {sceneFrames.length > 0 && sceneFrames.length < 10 && (
        <p className="text-white/40 text-xs text-center">
          Adding new scenes will be available in a future update.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Approve Button */}
      {allFramesComplete && (
        <button
          onClick={onApprove}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Approve Frames & Continue
        </button>
      )}
    </motion.div>
  );
}
