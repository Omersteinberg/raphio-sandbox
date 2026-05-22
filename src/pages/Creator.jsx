import { useState } from "react";
import ImagePipelineCreator from "./ImagePipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";

export default function Creator() {
  const [pipelineMode, setPipelineMode] = useState("image");

  if (pipelineMode === "references") {
    return <ReferencesPipelineCreator onModeChange={setPipelineMode} />;
  }
  return <ImagePipelineCreator onModeChange={setPipelineMode} />;
}
