import { useState } from "react";

export function usePreviewSelector() {
  const [provider, setProvider] = useState("kling");
  const [previewVideos, setPreviewVideos] = useState([]);

  return {
    provider,
    setProvider,
    previewVideos,
    setPreviewVideos,
  };
}
