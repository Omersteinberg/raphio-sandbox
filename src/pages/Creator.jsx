import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ImagePipelineCreator from "./ImagePipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";

// Brand Intro ("intro") is temporarily hidden while that pipeline is in progress.
const ENABLED_MODES = ["image", "references"];

export default function Creator() {
  const [searchParams] = useSearchParams();

  // When resuming a session (?session=&mode=), the session's own pipeline mode is
  // authoritative, otherwise the last-selected "new video" mode (localStorage)
  // renders the wrong creator and the resume drops the user on step 0 of the
  // wrong pipeline. Read once at mount; resume always remounts via /videos.
  const resumeMode = searchParams.get("mode");

  const [pipelineMode, setPipelineMode] = useState(() => {
    if (ENABLED_MODES.includes(resumeMode)) return resumeMode;
    const stored = localStorage.getItem("raphio_pipeline_mode");
    return ENABLED_MODES.includes(stored) ? stored : "image";
  });

  const handleModeChange = (mode) => {
    const next = ENABLED_MODES.includes(mode) ? mode : "image";
    localStorage.setItem("raphio_pipeline_mode", next);
    setPipelineMode(next);
  };

  if (pipelineMode === "references") {
    return <ReferencesPipelineCreator onModeChange={handleModeChange} />;
  }
  return <ImagePipelineCreator onModeChange={handleModeChange} />;
}
