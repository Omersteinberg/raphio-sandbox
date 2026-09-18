// Frontend mirror of merge-api's src/config/overlayFonts.js OVERLAY_FONT_REGISTRY.
// That module is the actual source of truth (it resolves fontId -> a bundled
// .ttf and throws on anything not registered here) - this file just gives the
// overlay-editing UI a closed list to pick from instead of a free-text field,
// so a client can never send an id resolveFontPath() will reject.
//
// FLAG: no shared/generated source existed for this before - these two lists
// were kept in sync by hand and drifted once already (see that file's "NOT
// YET RECONCILED WITH THE FRONTEND" comment, about the old "inter-bold" mock
// id). Still hand-synced; if a new font is added backend-side, add it here
// too or the UI won't be able to select it.
export const OVERLAY_FONTS = [
  { id: "default", label: "Figtree" },
  { id: "bricolage-grotesque", label: "Bricolage Grotesque" },
];

export const DEFAULT_OVERLAY_FONT_ID = "default";
