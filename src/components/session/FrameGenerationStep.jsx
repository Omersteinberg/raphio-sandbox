import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import ProgressChecklist from '@/components/session/ProgressChecklist';
import HelpFab from '@/components/ui/HelpFab';
import { useStepTour } from '@/lib/useStepTour';
import { TOUR_KEYS } from '@/lib/tourState';
import { startSceneFramesTour } from '@/lib/referencesTour';
import { useAuth } from '@/hooks/useAuth';
import { splitShots, referencesIn, referenceThumb } from '@/lib/shotBreakdown';

export default function FrameGenerationStep({
  sceneFrames,
  scriptData,
  framesLoading,
  onRegenerateScript,
  // Keep one of the scene's other takes (every scene is drawn several times and the
  // best is picked; the rest stay on offer).
  onChooseFrame,
  // The session's references (name, type, picture): shown under each shot that names them.
  references = [],
  onApprove,
  onDelete,
  onGenerateFrames,
  error,
  aspectRatio,
}) {
  const [feedbackByIndex, setFeedbackByIndex] = useState({});
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  // Which scenes have their other takes unfolded.
  const [takesOpen, setTakesOpen] = useState({});

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
                  {/* The box takes the video's own shape. Fixed at 16:9, a vertical
                      frame was shown with its top and bottom cropped off, which hid
                      exactly the parts worth checking on a phone video (and most of
                      an end card). */}
                  <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'} bg-surface-alt relative`}>
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
                    {Array.isArray(frame.candidates) && frame.candidates.length > 1 && (
                      <span className="absolute top-2 right-2 bg-white/85 text-[10px] font-bold px-2 py-1 rounded" style={{ color: '#C1440E' }}>
                        Best of {frame.candidates.length}
                      </span>
                    )}
                  </div>

                  {/* The other takes of this scene, a click away. One frame is shown,
                      the judge's pick; the rest stay folded so reviewing a storyboard
                      is not a comparison of fifteen pictures. */}
                  {Array.isArray(frame.candidates) && frame.candidates.length > 1 && onChooseFrame && (
                    <div className="px-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setTakesOpen((prev) => ({ ...prev, [index]: !prev[index] }))}
                        className="text-[11px] font-bold flex items-center gap-1"
                        style={{ color: '#C1440E' }}
                        aria-expanded={!!takesOpen[index]}
                      >
                        {takesOpen[index] ? 'Hide the other takes' : `Not quite? See ${frame.candidates.length - 1} other take${frame.candidates.length - 1 === 1 ? '' : 's'}`}
                      </button>
                      {takesOpen[index] && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {frame.candidates.map((url, k) => {
                            const current = url === (frame.imageUrl || frame.url);
                            return (
                              <button
                                key={`${k}-${url}`}
                                type="button"
                                title={current ? 'The one in use' : 'Use this one'}
                                onClick={() => !current && onChooseFrame(index, url)}
                                className={`relative rounded-lg overflow-hidden border-2 transition-colors ${current ? 'border-orange-500' : 'border-transparent hover:border-orange-300'}`}
                                style={{ width: aspectRatio === '9:16' ? 44 : 72, height: aspectRatio === '9:16' ? 78 : 40 }}
                                aria-label={current ? `Take ${k + 1}, in use` : `Use take ${k + 1}`}
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Narration & Info */}
                  <div className="p-3 space-y-2">
                    {section && (
                      <>
                        <p className="text-ink text-sm">{section.narrationText}</p>
                        {(() => {
                          // A scene of several shots is shown shot by shot, each with the
                          // photos that feed it; the still above is the first shot's opening
                          // frame, the rest are made from the photos in the video itself.
                          // The script's own shot list when it has one; else read off the description.
                          const shots = section.endCard
                            ? []
                            : (Array.isArray(section.shots) && section.shots.length >= 2 ? section.shots : splitShots(section.visualDescription));
                          if (shots.length < 2) {
                            return section.visualDescription ? (
                              <p className="text-ink-muted text-xs italic">Visual: {section.visualDescription}</p>
                            ) : null;
                          }
                          return (
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold" style={{ color: '#6B5E7B' }}>
                                {shots.length} shots in this scene. The picture above opens shot 1.
                              </p>
                              {shots.map((shot) => {
                                const used = (Array.isArray(shot.references)
                                  ? references.filter((r) => shot.references.includes(r?.name))
                                  : referencesIn(shot.text, references)).filter(referenceThumb);
                                // The still this shot opens on, when one was drawn (every shot after
                                // the first gets its own; the first is the big picture above).
                                const still = shot.number > 1 ? (frame.shots || []).find((x) => x && x.shot === shot.number)?.url : null;
                                return (
                                  <div key={shot.number} className="rounded-xl px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.03)' }}>
                                    {still && (
                                      <img
                                        src={still}
                                        alt={`Shot ${shot.number}`}
                                        className={`${aspectRatio === '9:16' ? 'w-20 aspect-[9/16]' : 'w-full aspect-video'} rounded-lg object-cover float-right ml-2 mb-1`}
                                      />
                                    )}
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[11px] font-bold" style={{ color: '#C1440E' }}>Shot {shot.number}</span>
                                      {used.length > 0 && (
                                        <span className="flex -space-x-1">
                                          {used.map((r) => (
                                            <img
                                              key={r.id || r.name}
                                              src={referenceThumb(r)}
                                              alt={r.name}
                                              title={r.name}
                                              className="w-6 h-6 rounded-md object-cover border-2"
                                              style={{ borderColor: '#FBFAF8' }}
                                            />
                                          ))}
                                        </span>
                                      )}
                                      {used.length > 0 && (
                                        <span className="text-[11px]" style={{ color: '#6B5E7B' }}>{used.map((r) => r.name).join(', ')}</span>
                                      )}
                                    </div>
                                    <p className="text-ink-muted text-xs italic">{shot.text}</p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
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
