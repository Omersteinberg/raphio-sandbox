// What the help FAB should do when it is clicked, given what the screen actually
// offers. Kept pure (and out of the component) so the branching has one home and
// real test coverage - the same split as resolveIntro/introGate in introVideos.js.
//
// "menu"  - both: ask the user which one they want (HelpMenuModal)
// "tour"  - tour only (ScriptStep, ReferenceLockStep, FrameGenerationStep)
// "video" - video only (the mode chooser): play it straight away, no menu
// "none"  - nothing to offer, so the FAB must not render at all
export function resolveHelpMode({ hasTour, hasVideo }) {
  if (hasTour && hasVideo) return "menu";
  if (hasTour) return "tour";
  if (hasVideo) return "video";
  return "none";
}
