import axios from "../services/api.js";
import { API_BASE } from "../config.js";

const SETTINGS_BASE = `${API_BASE}/settings`;

// Shape returned/accepted by the auto-approve endpoints. Every flag defaults
// OFF, which reproduces the normal manual wizard flow.
export const EMPTY_AUTO_APPROVE = {
  references: false,
  script: false,
  bridges: false,
  frames: false,
  generate: false,
};

/**
 * Load all of the signed-in user's settings in one call (used on login).
 * @returns {Promise<{autoApprove: object, autoApproveIntroSeen: boolean, introVideosSeen: string[]}>}
 */
export async function fetchSettings() {
  const { data } = await axios.get(SETTINGS_BASE);
  return {
    autoApprove: { ...EMPTY_AUTO_APPROVE, ...(data?.autoApprove || {}) },
    autoApproveIntroSeen: !!data?.onboarding?.autoApproveIntroSeen,
    // Default to [] so an older backend cannot crash the client.
    introVideosSeen: Array.isArray(data?.onboarding?.introVideosSeen)
      ? data.onboarding.introVideosSeen
      : [],
  };
}

/**
 * Mark the one-time "approve everything automatically" intro modal as seen so it
 * never shows again for this user.
 */
export async function markAutoApproveIntroSeen() {
  await axios.put(`${SETTINGS_BASE}/onboarding/auto-approve-intro-seen`);
}

/**
 * Mark one first-visit tutorial video as seen so it never auto-opens again.
 * @param {string} key one of the keys in INTRO_VIDEO_KEYS
 */
export async function markIntroVideoSeen(key) {
  await axios.put(`${SETTINGS_BASE}/onboarding/intro-video-seen`, { key });
}

/**
 * Persist one or more auto-approve toggles. Pass only the changed flags, e.g.
 * `saveAutoApprove({ script: true })`. Returns the full updated map.
 */
export async function saveAutoApprove(partial) {
  const { data } = await axios.put(`${SETTINGS_BASE}/auto-approve`, partial);
  return { ...EMPTY_AUTO_APPROVE, ...(data?.autoApprove || {}) };
}
