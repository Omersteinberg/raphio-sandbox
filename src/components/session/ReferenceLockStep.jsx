import { useState } from 'react';
import { motion } from 'framer-motion';

function ReferenceCard({ reference, isLoading, onRegenerate }) {
  const [feedback, setFeedback] = useState('');

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{reference.name}</h4>
          <p className="text-sm text-gray-500 mt-1">{reference.description}</p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            background: reference.source === 'uploaded' ? '#E0F2FE' : '#F0FDF4',
            color: reference.source === 'uploaded' ? '#0369A1' : '#15803D',
          }}
        >
          {reference.source === 'uploaded' ? 'Uploaded' : 'AI Generated'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Original */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-500">Original</span>
          <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
            {reference.originalUrl ? (
              <img src={reference.originalUrl} alt="Original" className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-gray-400 text-sm">
                No image
              </div>
            )}
          </div>
        </div>

        {/* Restyled/Locked */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-500">
            {reference.needsRestyle ? 'Restyled' : 'Locked'}
          </span>
          <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
            {isLoading ? (
              <div className="w-full aspect-square flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : reference.lockedUrl ? (
              <img src={reference.lockedUrl} alt="Locked" className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-gray-400 text-sm">
                Processing...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regenerate feedback */}
      {reference.lockedUrl && !isLoading && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback for regeneration..."
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              onRegenerate(reference.id, feedback);
              setFeedback('');
            }}
            className="text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReferenceLockStep({
  referenceData,
  lockLoading,
  onApproveAll,
  onRegenerate,
  loading,
}) {
  if (!referenceData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No references to review
      </div>
    );
  }

  const allRefs = [...(referenceData.characters || []), ...(referenceData.settings || [])];
  const allLocked = allRefs.every(r => r.lockedUrl);

  return (
    <div className="h-full overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Approve Your References</h2>
          <p className="text-gray-500">
            Review how your props and backgrounds look in the chosen style. Approve to continue or regenerate with feedback.
          </p>
        </div>

        {/* Props */}
        {referenceData.characters?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Props</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referenceData.characters.map((char) => (
                <ReferenceCard
                  key={char.id}
                  reference={char}
                  isLoading={lockLoading.has('__all__') || lockLoading.has(char.id)}
                  onRegenerate={onRegenerate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Backgrounds */}
        {referenceData.settings?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Backgrounds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referenceData.settings.map((setting) => (
                <ReferenceCard
                  key={setting.id}
                  reference={setting}
                  isLoading={lockLoading.has('__all__') || lockLoading.has(setting.id)}
                  onRegenerate={onRegenerate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Approve All */}
        {allLocked && lockLoading.size === 0 && (
          <div className="flex justify-center pt-4">
            <button
              onClick={onApproveAll}
              disabled={loading}
              className="px-8 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
            >
              {loading ? "Generating Script..." : "Approve All & Continue"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
