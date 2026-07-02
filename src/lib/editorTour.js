import { runTour } from "./tourCore";

// Interactive onboarding tours for the timeline editor, built on driver.js
// (imperative, so we can fire different mini-tours on demand). Steps target
// `[data-tour="..."]` anchors added in TimelineEditor.jsx; the timeline canvas
// reuses its existing `[data-timeline-container]` attribute.
//
// Parameterized by `isMobile`: the layouts differ only slightly (the Assets
// sidebar is desktop-only; zoom lives in the bottom bar on mobile). The shared
// driver setup and the "drop steps whose anchor is absent" logic live in
// tourCore.js.

export function startOverviewTour(isMobile) {
  const steps = [
    {
      element: '[data-tour="preview"]',
      popover: {
        title: "Your video preview",
        description: "Watch your video here as you edit. Press play to see your changes.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-timeline-container]",
      popover: {
        title: "The timeline",
        description:
          "Your clips, narration and music sit on these tracks. Drag a clip to move it, or drag its edges to trim it.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="controls"]',
      popover: {
        title: "Playback",
        description: isMobile
          ? "Play and pause your video here."
          : "Play, pause, and zoom the timeline in or out here.",
        side: "bottom",
        align: "center",
      },
    },
    // Desktop only: the Assets sidebar (hidden on mobile, where media is added
    // from the bottom bar instead).
    ...(!isMobile
      ? [
          {
            element: '[data-tour="asset-panel"]',
            popover: {
              title: "Your media",
              description:
                "All your clips and audio live here. Drag any of them onto a track in the timeline.",
              side: "right",
              align: "start",
            },
          },
        ]
      : []),
    {
      element: '[data-tour="action-bar"]',
      popover: {
        title: "Add to your video",
        description: isMobile
          ? "Add clips, audio or a voice-over, and zoom in or out, all from here."
          : "Add clips, audio or a voice-over here too.",
        side: "top",
        align: "center",
      },
    },
    // References-pipeline only: the button is absent otherwise, so runTour drops
    // this step automatically.
    {
      element: '[data-tour="references"]',
      popover: {
        title: "Your references",
        description:
          "See the character, setting and logo images that were used to create this video.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: '[data-tour="export"]',
      popover: {
        title: "Save your video",
        description: "Happy with it? Hit Export and we'll build your final video.",
        side: "bottom",
        align: "end",
      },
    },
  ];
  return runTour(steps);
}

export function startClipTour(isMobile) {
  const steps = [
    {
      element: '[data-tour="action-bar"]',
      popover: {
        title: "Edit this clip",
        description:
          "With a clip selected you can Split it, change its Speed, Regenerate the AI video, or Delete it.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-timeline-container]",
      popover: {
        title: "Move & trim",
        description: "Drag the clip to move it. Drag its edge handles to trim the start or end.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="done-editing"]',
      popover: {
        title: "Finished?",
        description: isMobile
          ? "Tap “Done editing clip” to deselect it."
          : "Click “Done editing clip” to deselect it.",
        side: "top",
        align: "center",
      },
    },
  ];
  return runTour(steps);
}
