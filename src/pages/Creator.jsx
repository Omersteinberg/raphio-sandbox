import { useState } from "react";
import ImagePipelineCreator from "./ImagePipelineCreator";
import CharacterPipelineCreator from "./CharacterPipelineCreator";

export default function Creator() {
  const [pipelineMode, setPipelineMode] = useState("image");

  if (pipelineMode === "character") {
    return <CharacterPipelineCreator onModeChange={setPipelineMode} />;
  }
  return <ImagePipelineCreator onModeChange={setPipelineMode} />;
}
