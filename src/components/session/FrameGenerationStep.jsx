import { useState } from 'react';
import { motion } from 'framer-motion';
import ProgressBar, { EMAIL_WAIT_NOTE } from '@/components/ui/ProgressBar';

export default function FrameGenerationStep({
  sceneFrames,
  scriptData,
  framesLoading,
  onRegenerateScript,
  onApprove,
  onDelete,
  onGenerateFrames,
  error,
}) {
  const [feedbackByIndex, setFeedbackByIndex] = useState({});
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);

  // Regenerate a scene from the user's feedback: the AI rewrites this scene's
  // script (narration, visual, scene prompt) and re-renders its still. Feedback
  // is required, so the button stays disabled until the user types what to change.
  const handleRegenerateFrame = async (index) => {
    const feedback = (feedbackByIndex[index] || '').trim();
    if (!feedback) return;
    setRegeneratingIndex(index);
    await onRegenerateScript(index, feedback);
    setFeedbackByIndex(prev => ({ ...prev, [index]: '' }));
    setRegeneratingIndex(null);
  };

  const allFramesComplete = sceneFrames.length > 0 && sceneFrames.every(f => f.status === 'completed' || f.status === 'success');

  console.log("[FrameGenerationStep] render, sceneFrames:", sceneFrames.length, "framesLoading:", framesLoading, "allFramesComplete:", allFramesComplete);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-2">Scene Frames</h2>
          <p className="text-ink-muted">
            Review the generated frames for your story. Regenerate any frame with feedback or approve all to continue.
          </p>
        </div>

        {/* Generate button if no frames yet */}
        {sceneFrames.length === 0 && !framesLoading && (
          <button
            onClick={() => onGenerateFrames()}
            className="w-full text-white font-medium py-3 rounded-xl"
            style={{ background: "var(--gradient-brand)" }}
          >
            Generate Scene Frames
          </button>
        )}

        {/* Loading state — show a progress bar (consistent with the app's other
            long-wait screens) instead of a bare spinner. No backend percentage
            is reported here, so ProgressBar trickles on its own. */}
        {framesLoading && sceneFrames.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ink font-medium mb-1">Generating scene frames…</p>
            <p className="text-ink-muted text-sm mb-4">Estimated time: ~5 minutes</p>
            <ProgressBar className="mx-auto w-full max-w-xs" note={EMAIL_WAIT_NOTE} estimatedMs={5 * 60 * 1000} />
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
                  className="border border-border rounded-xl overflow-hidden bg-white shadow-sm"
                >
                  {/* Image */}
                  <div className="aspect-video bg-surface-alt relative">
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terra"></div>
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
                        <p className="text-ink text-sm">{section.narrationText}</p>
                        {section.visualDescription && (
                          <p className="text-ink-muted text-xs italic">
                            Visual: {section.visualDescription}
                          </p>
                        )}
                      </>
                    )}

                    {/* Feedback + Actions — shown for completed AND failed frames.
                        A failed frame MUST be retryable, otherwise (since Approve
                        needs every frame to succeed) the user gets stuck. */}
                    {(() => {
                      const isDone = frame.status === 'completed' || frame.status === 'success';
                      const isFailed = frame.status === 'failed' || frame.status === 'error';
                      if (!isDone && !isFailed) return null;
                      const busy = regeneratingIndex === index;
                      const hasFeedback = !!(feedbackByIndex[index] || '').trim();
                      // Colored (brand gradient) when the button can be clicked or is
                      // already working; muted grey when it can't be clicked yet
                      // (no feedback typed). Gives a clear enabled vs disabled look.
                      const active = hasFeedback || busy;
                      return (
                        <div className="space-y-2 pt-1 border-t border-border">
                          <input
                            type="text"
                            value={feedbackByIndex[index] || ''}
                            onChange={(e) => setFeedbackByIndex(prev => ({ ...prev, [index]: e.target.value }))}
                            placeholder={isFailed ? "Describe what to change, then retry..." : "Describe what to change..."}
                            className="w-full bg-surface-alt border border-border rounded px-2 py-1 text-ink/80 text-xs placeholder-gray-400 focus:outline-none focus:border-terra"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRegenerateFrame(index)}
                              disabled={!hasFeedback || busy}
                              title={hasFeedback ? "Rewrite this scene from your feedback, then re-render the frame" : "Type what to change to enable"}
                              className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                                active
                                  ? 'text-white hover:opacity-90 disabled:opacity-70'
                                  : 'bg-surface-alt text-ink/40 cursor-not-allowed'
                              }`}
                              style={active ? { background: 'var(--gradient-brand)' } : undefined}
                            >
                              {busy ? 'Regenerating…' : (isFailed ? 'Retry' : 'Regen frame')}
                            </button>
                            <button
                              onClick={() => onDelete(index)}
                              disabled={sceneFrames.length <= 2 || busy}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded transition-colors disabled:opacity-30"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })()}
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
