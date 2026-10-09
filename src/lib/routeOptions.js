// The kinds of video the front door can route to, in the client's words. `id` is
// the creator's pipeline mode. Shared by StartComposer (the decision line) and
// Creator.jsx (the banner above the pipeline).
export const ROUTE_OPTIONS = [
  { id: "references", label: "An ad filmed with my real people and products", hint: "A 15–60 second ad: Raphio writes the story and films it with the team, products and logo from your photos." },
  { id: "image", label: "A video from my photos", hint: "Your photos come to life one after another: present your people, a celebration, a tribute." },
  { id: "intro", label: "A quick business promo", hint: "A punchy ~12 second promo: fast cuts, animated captions, your logo and brand colours. No filming." },
  { id: "prompt", label: "A video from my idea", hint: "No photos. Raphio invents the people and places from your words." },
];

// The router answers in its own names; the creator's modes differ for one of them.
export const MODE_OF_ROUTE = { references: "references", photos: "image", prompt: "prompt", intro: "intro" };

export const optionFor = (mode) => ROUTE_OPTIONS.find((o) => o.id === mode) || null;
