import VideoResult from "@/components/video/VideoResult";
import PostVideoSurvey from "@/components/session/PostVideoSurvey";

// Thin wrapper - the whole "video ready" view lives in the shared VideoResult
// component so this (the wizard's final step) and the standalone /video/:id page
// are identical. The wizard passes its in-place handlers: enterEditingMode and
// reset ("Create New").
export default function ResultStep({
  finalVideoUrl,
  scriptData,
  session,
  enterEditingMode,
  reset,
  // Dev-only mock previews (?mockLoading=done) pass a fake session/scriptData
  // with no real backend row behind them, so PostVideoSurvey - which submits
  // to the backend keyed on sessionId - is turned off there. Real callers
  // never pass this, so the survey is unaffected everywhere else.
  showSurvey = true,
}) {
  // Real length = sum of the generated section clip durations (ffmpeg-probed
  // during generation), same as VideoCard - the Video row has no duration column.
  const durationSections = session?.video?.sections ?? scriptData?.sections ?? [];
  const totalSecs = Math.round(
    durationSections.reduce((sum, s) => sum + (Number(s.clipDuration) || 0), 0)
  );
  const durationLabel =
    totalSecs > 0 ? `${Math.floor(totalSecs / 60)}:${String(totalSecs % 60).padStart(2, "0")}` : null;

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-start p-4 md:p-8 pb-16">
      <div className="w-full max-w-4xl">
        <VideoResult
          sessionId={session?.id}
          finalVideoUrl={finalVideoUrl}
          title={scriptData?.title}
          style={scriptData?.style || session?.style}
          sectionsCount={scriptData?.sections?.length ?? session?.video?.sections?.length}
          duration={durationLabel}
          model={session?.videoModel}
          onEdit={enterEditingMode}
          onCreateNew={reset}
        />
        {showSurvey && (
          <PostVideoSurvey
            sessionId={session?.id}
            title={scriptData?.title}
            model={session?.videoModel}
          />
        )}
      </div>
    </div>
  );
}
