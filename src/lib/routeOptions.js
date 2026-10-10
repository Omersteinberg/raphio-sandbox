// The kinds of video the front door can route to, in the client's words. `id` is
// the creator's pipeline mode. Shared by StartComposer (the decision line) and
// Creator.jsx (the banner above the pipeline).
export const ROUTE_OPTIONS = [
  { id: "references", label: "An ad filmed with my real people and products", hint: "A 15 to 60 second ad: Raphio writes the story and films it with the team, products and logo from your photos." },
  { id: "image", label: "A video from my photos", hint: "Your photos come to life one after another: present your people, a celebration, a tribute." },
  { id: "intro", label: "A quick business promo", hint: "A short 10 to 30 second animated promo: fast cuts, animated captions, your logo and brand colours. No filming." },
  { id: "prompt", label: "A video from my idea", hint: "No photos. Raphio invents the people and places from your words." },
];

// The prompt box's example line, by what the client said their business is.
export const PLACEHOLDER_BY_USE_CASE = {
  real_estate: "e.g. Open home this Saturday at 12 Smith St, Brunswick",
  hospitality: "e.g. Grand opening of my cafe this Saturday, free coffee for the first 50",
  ecommerce: "e.g. Launch video for our new linen range",
  trades: "e.g. Spring promo for my plumbing business",
  personal: "e.g. A birthday video for my sister",
};
export const DEFAULT_PLACEHOLDER = "e.g. Spring promo for my small business";

// The router answers in its own names; the creator's modes differ for one of them.
export const MODE_OF_ROUTE = { references: "references", photos: "image", prompt: "prompt", intro: "intro" };

export const optionFor = (mode) => ROUTE_OPTIONS.find((o) => o.id === mode) || null;
