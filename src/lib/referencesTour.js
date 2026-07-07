import { runTour } from "./tourCore";

// First-run tours for the references pipeline's two review gates: the
// reference lock step (ReferenceLockStep) and the scene frames step
// (FrameGenerationStep). Both fire only once everything has finished
// generating (the regenerate rows and approve buttons exist only then), so
// every anchor below is present when the tour runs. Exceptions degrade
// gracefully via runTour's absent-anchor filtering, e.g. a logos-only
// session has no regenerate row.

export function startReferenceLockTour(isMobile) {
  const steps = [
    {
      element: '[data-tour="ref-card"]',
      popover: {
        title: "Original vs styled",
        description:
          "Compare your original with how it will look in your video's style. Logos are always preserved exactly.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="ref-regen"]',
      popover: {
        title: "Not quite right?",
        description:
          "Type what to change and hit Regenerate. The new version builds on the previous image, so it improves instead of starting over.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="ref-approve"]',
      popover: {
        title: "Lock them in",
        description:
          "These exact references will appear throughout your video. Approving locks them and writes your script.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="help"]',
      popover: {
        title: "Need a refresher?",
        description: isMobile
          ? "Tap this button any time to see this guide again."
          : "Click this button any time to see this guide again.",
        side: "left",
        align: "end",
      },
    },
  ];
  return runTour(steps);
}

export function startSceneFramesTour(isMobile) {
  const steps = [
    {
      element: '[data-tour="frame-card"]',
      popover: {
        title: "One frame per scene",
        description:
          "Each card is a scene from your script: its frame, narration, and visuals. These frames become your video clips.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="frame-regen"]',
      popover: {
        title: "Reshape a scene",
        description:
          "Type what to change and hit Regen frame. The AI rewrites this scene's script and re-renders the frame.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="frame-delete"]',
      popover: {
        title: "Drop a scene",
        description:
          "Delete removes the scene from your video entirely. You need at least 2 scenes.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="frames-approve"]',
      popover: {
        title: "Ready to render",
        description:
          "Approve to start generating your video. This is the big render, so make sure the frames look right first.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="help"]',
      popover: {
        title: "Need a refresher?",
        description: isMobile
          ? "Tap this button any time to see this guide again."
          : "Click this button any time to see this guide again.",
        side: "left",
        align: "end",
      },
    },
  ];
  return runTour(steps);
}
