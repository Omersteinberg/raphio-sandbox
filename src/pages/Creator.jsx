import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ImagePipelineCreator from "./ImagePipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";
import ModeChooser from "@/components/session/ModeChooser";
import MaintenanceScreen from "@/components/session/MaintenanceScreen";
import IntroVideoModal from "@/components/IntroVideoModal";
import HelpFab from "@/components/ui/HelpFab";
import { useIntroVideo } from "@/hooks/useIntroVideo";
import { INTRO_VIDEO_KEYS } from "@/lib/introVideos";
import { RESUMABLE_MODES } from "@/lib/pipelineMode";
import { MAINTENANCE_MODE } from "@/config";

// Brand Intro ("intro") is temporarily hidden while that pipeline is in progress.
// "prompt" is the simplified text-to-video mode; it reuses the image pipeline
// (ImagePipelineCreator) with photos + advanced settings hidden.
// Shared with the resume bounce in useSession/useSessionBase so the two can't drift.
const ENABLED_MODES = RESUMABLE_MODES;

export default function Creator() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Must run before the `!chosen` early return: hooks cannot be conditional.
  const intro = useIntroVideo(INTRO_VIDEO_KEYS.modeChooser);

  // When resuming a session (?session=&mode=), the session's own pipeline mode is
  // authoritative, otherwise the last-selected "new video" mode (localStorage)
  // renders the wrong creator and the resume drops the user on step 0 of the
  // wrong pipeline. Read once at mount; resume always remounts via /videos.
  const resumeMode = searchParams.get("mode");
  const resumeSession = searchParams.get("session");

  const [pipelineMode, setPipelineMode] = useState(() => {
    if (ENABLED_MODES.includes(resumeMode)) return resumeMode;
    const stored = localStorage.getItem("raphio_pipeline_mode");
    return ENABLED_MODES.includes(stored) ? stored : "image";
  });

  // A resume (either ?session= or a valid ?mode=) must bypass the chooser and
  // load straight into the pipeline. A bare /create (the "New video" button)
  // starts with no mode chosen, so the chooser shows first.
  const [chosen, setChosen] = useState(
    () => Boolean(resumeSession) || ENABLED_MODES.includes(resumeMode)
  );

  const handleModeChange = (mode) => {
    const next = ENABLED_MODES.includes(mode) ? mode : "image";
    localStorage.setItem("raphio_pipeline_mode", next);
    // Reflect the picked mode in the URL so the selection survives a route
    // change (e.g. visiting /settings and pressing Back): the /create history
    // entry then carries ?mode=, which re-initializes `chosen` to true instead
    // of dropping the user back on the chooser. A bare /create ("New video")
    // still has no mode param, so it correctly shows the chooser.
    setSearchParams({ mode: next }, { replace: true });
    setPipelineMode(next);
    setChosen(true);
  };

  if (!chosen) {
    if (MAINTENANCE_MODE) {
      return <MaintenanceScreen />;
    }
    return (
      <>
        <ModeChooser
          initialMode={localStorage.getItem("raphio_pipeline_mode")}
          onPick={handleModeChange}
        />
        <IntroVideoModal
          open={intro.open}
          src={intro.src}
          title={intro.title}
          onClose={intro.close}
          onDismissWithoutSeen={intro.dismissWithoutSeen}
        />
        {/* No tour on this screen, so the FAB skips the menu and replays the
            video straight into the modal above. */}
        <HelpFab onPlayVideo={intro.replay} />
      </>
    );
  }

  const backToChooser = () => setChosen(false);

  if (pipelineMode === "references") {
    return (
      <ReferencesPipelineCreator
        onModeChange={handleModeChange}
        onBackToChooser={backToChooser}
      />
    );
  }
  // Both "prompt" and "image" render the image pipeline; the mode distinguishes
  // the simplified prompt-only variant (photos + advanced hidden).
  // `key` forces a remount when the user switches between them: without it React
  // keeps the same instance and useSession's state (prompt, photos, style) bleeds
  // across modes — a photo picked in image mode then survives into prompt-only as
  // an invisible @mention target ("@Opening shot").
  return (
    <ImagePipelineCreator
      key={pipelineMode}
      mode={pipelineMode}
      onModeChange={handleModeChange}
      onBackToChooser={backToChooser}
    />
  );
}
