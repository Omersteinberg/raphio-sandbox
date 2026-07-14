import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import ProgressChecklist from '@/components/session/ProgressChecklist';
import HelpFab from '@/components/ui/HelpFab';
import { useStepTour } from '@/lib/useStepTour';
import { TOUR_KEYS } from '@/lib/tourState';
import { startSceneFramesTour } from '@/lib/referencesTour';
import { useAuth } from '@/hooks/useAuth';

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
  const { autoApprove } = useAuth();

  // First-run tour of the scene-frames review. Fires only when every frame
  // finished: that is when the per-card actions and Approve button exist. Skipped
  // when frames are auto-approved, so it doesn't flicker as the wizard advances.
  const framesTour = useStepTour(TOUR_KEYS.sceneFrames, startSceneFramesTour, {
    enabled: allFramesComplete && !autoApprove.frames,
  });

  // Scene frames auto-generate on entry. While generating, show the same shared
  // checklist as the rest of the journey (consistent progress UI).
  if (sceneFrames.length === 0 && framesLoading) {
    return (
      <ProgressChecklist
        title="Creating your scenes"
        caption="Estimated time: ~5 minutes"
        headerIcon={ImageIcon}
        tasks={[
          { id: "scenes", name: "Generating scene frames", description: "Designing a frame for each scene", icon: ImageIcon, status: "processing" },
        ]}
      />
    );
  }

  // Empty and not generating: either about to auto-start, or a previous attempt
  // failed. Offer a manual generate so the flow can never get permanently stuck.
  if (sceneFrames.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <p className="text-ink font-medium mb-1">Preparing your scenes</p>
        {error && <p className="text-red-500 text-sm mb-3 max-w-sm">{error}</p>}
        <button
          onClick={() => onGenerateFrames?.()}
          className="mt-2 text-white font-medium py-2.5 px-6 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: "var(--gradient-brand)" }}
        >
          Generate scene frames
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-2">Scene Frames</h2>
          <p className="text-ink-muted">
            Review the generated frames for your story. Regenerate any frame with feedback or approve all to continue.
          </p>
        </div>

        {/* Frame Grid */}
        {sceneFrames.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sceneFrames.map((frame, index) => {
              const section = scriptData?.sections?.[index];
              return (
                <div
                  key={index}
                  data-tour={index === 0 ? 'frame-card' : undefined}
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

                    {/* Feedback + Actions - shown for completed AND failed frames.
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
                        <div className="space-y-2 pt-1 border-t border-border" data-tour={index === 0 ? 'frame-regen' : undefined}>
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
                              data-tour={index === 0 ? 'frame-delete' : undefined}
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

        {/* Approve + generate. Voice and music are already set on the first page,
            so approving the frames goes straight to video generation. */}
        {allFramesComplete && (
          <button
            onClick={onApprove}
            data-tour="frames-approve"
            className="w-full text-white font-medium py-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-brand)" }}
          >
            Approve &amp; Generate Video
          </button>
        )}
      </div>

      {allFramesComplete && <HelpFab onStartTour={framesTour.replay} />}
    </div>
  );
}
