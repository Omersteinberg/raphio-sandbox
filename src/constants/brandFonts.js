// Mirrors BRAND_FONT_NAMES in the backend's src/config/brandFonts.js and in
// merge-api's remotion/fonts.js. All three must stay identical, in the same
// order: this list is what the select offers, the backend list is what the model
// is allowed to return, and the Remotion list is what can actually be loaded at
// render time. A font that exists in one but not another is either an option
// that cannot render or a render that has no option.
export const BRAND_FONT_NAMES = [
  "Figtree", "Inter", "Poppins", "Montserrat", "DM Sans",
  "Work Sans", "Baloo 2", "Fredoka",
  "Playfair Display", "Fraunces", "Bebas Neue", "Roboto Slab",
];

// Matches the hardcoded family the Remotion bundle used before fonts became
// per project, so an intro made without a font choice looks like it always did.
export const DEFAULT_BRAND_FONTS = { heading: "Baloo 2", body: "Baloo 2" };
