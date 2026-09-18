import { runTour } from "./tourCore";

// Shared first step for startImageTour/startReferencesTour. No custom
// onHighlightStarted needed: runTour() already resets the page to the top
// before the first popover appears (any tour, not just this one), and the
// shared per-step alignment (tourCore.js's DRIVER_OPTS.onHighlightStarted)
// aligns this element to the viewport top like every other step - both
// apply automatically through the normal runTour() path.
const modeTabsStep = {
  element: '[data-tour="mode-tabs"]',
  popover: {
    title: "Switch modes anytime",
    description: "Everything you've entered comes with you.",
    side: "bottom",
    align: "center",
  },
};

// First-run onboarding tours for the creation screen (PromptStep). Two separate
// tours, one per pipeline mode, mirroring the editor's overview/clip split.
// Steps target `[data-tour="..."]` anchors in PromptStep.jsx; any step whose
// anchor isn't in the DOM (e.g. the photo upload, which is hidden in prompt-only
// mode) is dropped by runTour. Parameterized by `isMobile` for future per-platform copy.

export function startImageTour(isMobile) {
  const steps = [
    modeTabsStep,
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
      element: '[data-tour="prompt"]',
      popover: {
        title: "Describe your video",
        description: "Tell us what your video is about here. More detail means better results.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: "Pick your style",
        description: "Choose the visual look for your video.",
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
          ? "Tap this button any time to replay this guide or rewatch the video."
          : "Click this button any time to replay this guide or rewatch the video.",
        side: "left",
        align: "end",
      },
    },
  ];
  return runTour(steps);
}

// Brand Intro's own composer (IntroBriefStep) - a different screen shape than
// Prompt/Image/References (identity fields + one brief textarea, not a
// photo/reference upload), so this mirrors the SHAPE of the other two tours
// (identity/content -> settings -> CTA -> help) rather than reusing their
// copy. Scoped to the composer step only, same as startImageTour/
// startReferencesTour are scoped to PromptStep alone, not the steps after it.
export function startIntroTour(isMobile) {
  const steps = [
    {
      element: '[data-tour="intro-fetch"]',
      popover: {
        title: "Paste your website",
        description: "We'll scan it and draft your brief automatically - skip typing it all out yourself.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="intro-identity"]',
      popover: {
        title: "Add your logo and name",
        description: "Your logo is required - it lands on the closing scene. Your business name shows on screen too.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="intro-brief"]',
      popover: {
        title: "Describe your business",
        description: "Say what you do, who it's for, and what makes you different. We'll write the script from this.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="intro-settings"]',
      popover: {
        title: "Photos, length, and brand kit",
        description: isMobile
          ? "Tap to add photos, set a length and shape, and tweak your brand colors."
          : "Add photos, pick a length and shape, and tweak your brand colors.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="intro-cta"]',
      popover: {
        title: "Write your script",
        description: "When you're ready, hit Continue to script.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="help"]',
      popover: {
        title: "Need a refresher?",
        description: isMobile
          ? "Tap this button any time to replay this guide."
          : "Click this button any time to replay this guide.",
        side: "left",
        align: "end",
      },
    },
  ];
  return runTour(steps);
}

export function startReferencesTour(isMobile) {
  const steps = [
    modeTabsStep,
    {
      element: '[data-tour="references"]',
      popover: {
        title: "Your world",
        description: isMobile
          ? "Add the people, places, logos, or products that belong in your world. Name each one, then upload an image or let AI generate it."
          : "Add the people, places, logos, or products that belong in your world. Give each a name and description, then upload an image or let AI generate one.",
        side: "top",
        align: "center",
      },
    },
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
      element: '[data-tour="settings"]',
      popover: {
        title: "Pick your style",
        description: "Choose the visual look.",
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
          ? "Tap this button any time to replay this guide or rewatch the video."
          : "Click this button any time to replay this guide or rewatch the video.",
        side: "left",
        align: "end",
      },
    },
  ];
  return runTour(steps);
}
