import { useState } from "react";
import ImagePipelineCreator from "./ImagePipelineCreator";
import CharacterPipelineCreator from "./CharacterPipelineCreator";
import ReferencesPipelineCreator from "./ReferencesPipelineCreator";

export default function Creator() {
  const [pipelineMode, setPipelineMode] = useState("image");

  if (pipelineMode === "references") {
    return <ReferencesPipelineCreator onModeChange={setPipelineMode} />;
  }
  if (pipelineMode === "character") {
    return <CharacterPipelineCreator onModeChange={setPipelineMode} />;
  }
  return <ImagePipelineCreator onModeChange={setPipelineMode} />;
}
