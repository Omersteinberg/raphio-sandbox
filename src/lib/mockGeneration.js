// Dev-only completion-state ("Your Video is Ready!") preview data, shared by
// all four pipelines' ?mockLoading=done handling (see each *PipelineCreator.jsx).
// Only ever imported from DEV-gated branches, so once those branches fold to
// dead code in a production build, this import (and this module) drop out too.
import { introVideoSrc, INTRO_VIDEO_KEYS } from "@/lib/introVideos";

// Reuses an existing, already-trusted video asset (the My Videos tutorial
// clip) instead of inventing a placeholder URL - it's already fetched by the
// app for real onboarding, just pointed at here for a player to have
// something real to load.
export const MOCK_VIDEO_URL = introVideoSrc(INTRO_VIDEO_KEYS.myVideos);

export const MOCK_SCRIPT_DATA = {
  title: "Mock Preview Video",
  sections: [1, 2, 3, 4].map((n) => ({ id: `mock-section-${n}` })),
};

export function mockSession(style, videoModel = "VEO") {
  return { id: "mock-preview", videoModel, style };
}
