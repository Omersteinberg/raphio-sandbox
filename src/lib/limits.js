// merge-frontend/src/lib/limits.js
export const CREDITS_PER_CLIP = 1; // single-clip regeneration only (~5s re-roll)
export const MAX_IMAGES = 10;   // images per video (image pipeline pool)

// Full video generation is priced by the selected duration — 1 credit per 5s,
// banded to the UI presets. Keep in sync with credits.service.js on the backend.
// Applies to both the image and references pipelines.
const SECONDS_PER_CREDIT = 5;
export const DURATION_CREDIT_TIERS = [
  { maxSeconds: 15, credits: 3 },
  { maxSeconds: 30, credits: 6 },
  { maxSeconds: 45, credits: 9 },
  { maxSeconds: 60, credits: 12 },
];

/**
 * Credits charged for a video of the given selected duration (seconds).
 * Returns 0 for unknown/zero so callers can treat "no cost yet" as affordable.
 */
export function creditsForDuration(targetSeconds) {
  const secs = Math.ceil(Number(targetSeconds) || 0);
  if (secs <= 0) return 0;
  const tier = DURATION_CREDIT_TIERS.find((t) => secs <= t.maxSeconds);
  return tier ? tier.credits : Math.ceil(secs / SECONDS_PER_CREDIT);
}
