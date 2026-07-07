import { runTour } from "./tourCore";

// First-run tour for the script review step (ScriptStep), shared by the image
// pipeline's outline phase and the references pipeline's script phase.
//
// Breakpoint trap: ScriptStep collapses its AI editor sidebar below lg
// (1024px) into a bottom sheet behind the "Edit with AI" FAB, but the hidden
// sidebar STAYS IN THE DOM, so runTour's presence check would happily
// highlight an invisible element. We branch on the same 1023px media query
// ScriptStep's `isCompact` uses (NOT the 768px isMobile flag) and include
// only the visible target's step.

export function startScriptReviewTour(isMobile) {
  const isCompact = window.matchMedia("(max-width: 1023px)").matches;
  const steps = [
    {
      element: '[data-tour="script-sections"]',
      popover: {
        title: "Your script, scene by scene",
        description:
          "Each card is one scene: what the narrator says and what appears on screen. Give it a quick read.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="script-edit"]',
      popover: {
        title: "Edit any scene directly",
        description: isMobile
          ? "Tap the pencil to tweak a scene's narration, visuals, or timing."
          : "Click the pencil to tweak a scene's narration, visuals, or timing.",
        side: "bottom",
        align: "center",
      },
    },
    isCompact
      ? {
          element: '[data-tour="script-ai-fab"]',
          popover: {
            title: "Or ask the AI",
            description:
              "Tap Edit with AI and describe changes in plain words, like 'make the opening punchier'.",
            side: "top",
            align: "end",
          },
        }
      : {
          element: '[data-tour="script-ai"]',
          popover: {
            title: "Or ask the AI",
            description:
              "Describe changes in plain words, like 'make the opening punchier', and the AI updates the whole script.",
            side: "left",
            align: "start",
          },
        },
    {
      element: '[data-tour="script-approve"]',
      popover: {
        title: "Approve when you're happy",
        description: "Approving locks the script and moves you to the next step.",
        side: "bottom",
        align: "end",
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
