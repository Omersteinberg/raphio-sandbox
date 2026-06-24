import { useState } from "react";
import ImagePipelineCreator from "./ImagePipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";

// Brand Intro ("intro") is temporarily hidden while that pipeline is in progress.
const ENABLED_MODES = ["image", "references"];

export default function Creator() {
  const [pipelineMode, setPipelineMode] = useState(() => {
    const stored = localStorage.getItem("raphio_pipeline_mode");
    // Ignore stale/disabled modes (e.g. a previously-selected "intro").
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
