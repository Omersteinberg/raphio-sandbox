import { useState } from "react";
import ImagePipelineCreator from "./ImagePipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";

export default function Creator() {
  const [pipelineMode, setPipelineMode] = useState(() => {
    return localStorage.getItem("raphio_pipeline_mode") || "image";
  });

  const handleModeChange = (mode) => {
    localStorage.setItem("raphio_pipeline_mode", mode);
    setPipelineMode(mode);
  };

  if (pipelineMode === "references") {
    return <ReferencesPipelineCreator onModeChange={handleModeChange} />;
  }
  return <ImagePipelineCreator onModeChange={handleModeChange} />;
}
