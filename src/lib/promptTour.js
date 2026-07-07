import { runTour } from "./tourCore";

// First-run onboarding tours for the creation screen (PromptStep). Two separate
// tours, one per pipeline mode, mirroring the editor's overview/clip split.
// Steps target `[data-tour="..."]` anchors in PromptStep.jsx; any step whose
// anchor isn't in the DOM (e.g. the photo upload, which is hidden in prompt-only
// mode) is dropped by runTour. Parameterized by `isMobile` for future per-platform copy.

export function startImageTour(isMobile) {
  const steps = [
    {
      element: '[data-tour="prompt"]',
      popover: {
        title: "Describe your video",
        description: "Tell us what your video is about here. More detail means better results.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="upload"]',
      popover: {
        title: "Add your photos",
        description: isMobile
          ? "Tap to add your photos, then drag them to reorder the story."
          : "Drag photos in or click to browse, then drag to reorder the story.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: "Style and format",
        description: "Pick a look, length, and shape for your video.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="cta"]',
      popover: {
        title: "Create your video",
        description: "When you're ready, hit Create my video.",
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

export function startReferencesTour(isMobile) {
  const steps = [
    {
      element: '[data-tour="prompt"]',
      popover: {
        title: "Set the direction",
        description: "Describe the overall direction of your video here.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="references"]',
      popover: {
        title: "Your references",
        description: isMobile
          ? "Add the people, places, logos or products that should appear. Name each one, then upload a reference or let AI generate it."
          : "Add the people, places, logos or products that should appear. Give each a name and description, then upload a reference or let AI generate one.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: "Style and format",
        description: "Pick a look, length, and shape.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="cta"]',
      popover: {
        title: "Create your video",
        description: "Happy with it? Hit Create my video.",
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
