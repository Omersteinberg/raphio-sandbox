import { useState } from 'react';
import { motion } from 'framer-motion';

export default function CharacterLockStep({
  character,
  lockedImage,
  lockLoading,
  lockRegenerateCount,
  onApprove,
  onRegenerate,
}) {
  const [feedback, setFeedback] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Approve Your Character</h2>
        <p className="text-gray-500">
          Review how {character.name} looks in your chosen style. Approve to continue or regenerate with feedback.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Original */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Original Reference</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <img
              src={character.referenceImage}
              alt="Original"
              className="w-full aspect-square object-contain"
            />
          </div>
        </div>

        {/* Style-Locked */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Style-Locked Version</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            {lockLoading ? (
              <div className="w-full aspect-square flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Generating...</p>
                </div>
              </div>
            ) : lockedImage ? (
              <img
                src={lockedImage}
                alt="Style-locked"
                className="w-full aspect-square object-contain"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-gray-400">
                No image generated yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Character Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-900 font-medium">{character.name}</p>
        <p className="text-gray-500 text-sm">{character.description}</p>
      </div>

      {/* Feedback + Actions */}
      {!lockLoading && lockedImage && (
        <div className="space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback for regeneration (e.g., 'make the hair darker', 'more dramatic lighting')"
            rows={2}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={onApprove}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Approve & Continue
            </button>
            <button
              onClick={() => {
                onRegenerate(feedback);
                setFeedback('');
              }}
              disabled={lockRegenerateCount >= 3}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Regenerate {lockRegenerateCount > 0 ? `(${lockRegenerateCount}/3)` : ''}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
