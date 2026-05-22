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

  const allFramesComplete = sceneFrames.length > 0 && sceneFrames.every(f => f.status === 'completed' || f.status === 'success');

  console.log("[FrameGenerationStep] render — sceneFrames:", sceneFrames.length, "framesLoading:", framesLoading, "allFramesComplete:", allFramesComplete);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Scene Frames</h2>
          <p className="text-gray-500">
            Review the generated frames for your story. Regenerate any frame with feedback or approve all to continue.
          </p>
        </div>

        {/* Generate button if no frames yet */}
        {sceneFrames.length === 0 && !framesLoading && (
          <button
            onClick={() => onGenerateFrames()}
            className="w-full text-white font-medium py-3 rounded-xl"
            style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
          >
            Generate Scene Frames
          </button>
        )}

        {/* Loading state */}
        {framesLoading && sceneFrames.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-3"></div>
            <p className="text-gray-500">Generating scene frames...</p>
          </div>
        )}

        {/* Frame Grid */}
        {sceneFrames.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sceneFrames.map((frame, index) => {
              const section = scriptData?.sections?.[index];
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
                >
                  {/* Image */}
                  <div className="aspect-video bg-gray-100 relative">
                    {(frame.status === 'completed' || frame.status === 'success') && (frame.imageUrl || frame.url) ? (
                      <img
                        src={frame.imageUrl || frame.url}
                        alt={`Scene ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : frame.status === 'failed' || frame.status === 'error' ? (
                      <div className="w-full h-full flex items-center justify-center text-red-500 text-sm">
                        Failed to generate
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    )}
                    {/* Scene number badge */}
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      Scene {index + 1}
                    </span>
                  </div>

                  {/* Narration & Info */}
                  <div className="p-3 space-y-2">
                    {section && (
                      <>
                        <p className="text-gray-800 text-sm">{section.narrationText}</p>
                        {section.visualDescription && (
                          <p className="text-gray-400 text-xs italic">
                            Visual: {section.visualDescription}
                          </p>
                        )}
                      </>
                    )}

                    {/* Feedback + Actions */}
                    {(frame.status === 'completed' || frame.status === 'success') && (
                      <div className="space-y-2 pt-1 border-t border-gray-100">
                        <input
                          type="text"
                          value={feedbackByIndex[index] || ''}
                          onChange={(e) => setFeedbackByIndex(prev => ({ ...prev, [index]: e.target.value }))}
                          placeholder="Feedback for regeneration..."
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs placeholder-gray-400 focus:outline-none focus:border-purple-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRegenerate(index)}
                            disabled={regeneratingIndex === index}
                            className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded transition-colors disabled:opacity-50"
                          >
                            {regeneratingIndex === index ? 'Regenerating...' : 'Regenerate'}
                          </button>
                          <button
                            onClick={() => onDelete(index)}
                            disabled={sceneFrames.length <= 2}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded transition-colors disabled:opacity-30"
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

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
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
      </div>
    </div>
  );
}
