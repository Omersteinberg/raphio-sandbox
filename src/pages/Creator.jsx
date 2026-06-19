import { useState } from "react";
import ImagePipelineCreator from "./ImagePipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";
import IntroPipelineCreator from "./IntroPipelineCreator";

export default function Creator() {
  const [pipelineMode, setPipelineMode] = useState("image");

  if (pipelineMode === "references") {
    return <ReferencesPipelineCreator onModeChange={setPipelineMode} />;
  }
  if (pipelineMode === "intro") {
    return <IntroPipelineCreator onModeChange={setPipelineMode} />;
  }
  return <ImagePipelineCreator onModeChange={setPipelineMode} />;
}
