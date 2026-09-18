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
        description: "Play, pause, Split the selected clip, and zoom the timeline in or out here.",
        side: "bottom",
        align: "center",
      },
    },
    // Desktop only: the persistent Assets + Audio panel (hidden on mobile,
    // where media is added from the bottom bar instead). It never disappears
    // based on what's selected, so it only needs describing once here.
    //
    // The panel defaults to its Media tab (video clips only) - Upload/AI
    // voice-over live under the separate Audio tab, added when Media and
    // Audio were split into their own scopes so audio assets stopped being
    // listed in both places. Rewriting the copy to point at that tab (rather
    // than adding a whole extra step just to highlight the tab switcher) is
    // the smaller change and keeps this a single step, same as before.
    ...(!isMobile
      ? [
          {
            element: '[data-tour="asset-panel"]',
            popover: {
              title: "Your media",
              description:
                "Your video clips live here, and stay here no matter what's selected. Switch to the Audio tab above to upload audio, generate an AI voice-over, or browse narration and music - then drag anything onto a track below.",
              side: "right",
              align: "start",
            },
          },
        ]
      : []),
    // Mobile only: media lives in the bottom bar instead of a sidebar, and
    // that row is always present (unlike desktop, this step has no
    // no-selection anchor on desktop, so it's skipped there entirely).
    ...(isMobile
      ? [
          {
            element: '[data-tour="action-bar"]',
            popover: {
              title: "Add to your video",
              description: "Add clips, audio or a voice-over here, any time.",
              side: "top",
              align: "center",
            },
          },
        ]
      : []),
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
    // Was anchored to [data-tour="action-bar"] - the persistent Media/Audio/
    // Text/Elements/Settings bottom bar, which has never held clip actions.
    // Clip-contextual actions (Split, Speed, Volume, and whichever of
    // Regenerate/Narration/New music applies to this clip's type, plus
    // Delete) live in the floating ClipActionPill, which now carries this
    // anchor. Copy rewritten to match: Split/Speed/Volume/Delete are always
    // in the row (confirmed against TimelineEditor's clipActions() and the
    // always-passed speedControl/volumeControl), but Regenerate only shows
    // for a video clip and Narration/New music only for specific audio
    // clips - so the copy names them as "whichever" rather than claiming
    // every clip has all of them.
    {
      element: '[data-tour="clip-actions"]',
      popover: {
        title: "Edit this clip",
        description:
          "Split it, adjust its Speed or Volume, and use whichever other action applies - Regenerate, Narration, or Delete.",
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
    // Was anchored to [data-tour="done-editing"] - that standalone toggle
    // was removed from the toolbar (deselecting now happens by tapping
    // empty timeline space instead), so the element no longer exists on
    // either platform. Re-anchored to the timeline container itself, the
    // same anchor the previous step already uses, since there's no more
    // specific element for "empty space on the timeline."
    {
      element: "[data-timeline-container]",
      popover: {
        title: "Finished?",
        description: isMobile
          ? "Tap an empty part of the timeline to deselect the clip."
          : "Click an empty part of the timeline to deselect the clip.",
        side: "top",
        align: "center",
      },
    },
  ];
  return runTour(steps);
}
