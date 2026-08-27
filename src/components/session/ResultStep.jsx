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
  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-start p-4 md:p-8 pb-16">
      <div className="w-full max-w-4xl">
        <VideoResult
          sessionId={session?.id}
          finalVideoUrl={finalVideoUrl}
          title={scriptData?.title}
          style={scriptData?.style || session?.style}
          sectionsCount={scriptData?.sections?.length ?? session?.video?.sections?.length}
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
