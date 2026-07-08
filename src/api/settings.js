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
 * @returns {Promise<{autoApprove: object, autoApproveIntroSeen: boolean}>}
 */
export async function fetchSettings() {
  const { data } = await axios.get(SETTINGS_BASE);
  return {
    autoApprove: { ...EMPTY_AUTO_APPROVE, ...(data?.autoApprove || {}) },
    autoApproveIntroSeen: !!data?.onboarding?.autoApproveIntroSeen,
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
 * Persist one or more auto-approve toggles. Pass only the changed flags, e.g.
 * `saveAutoApprove({ script: true })`. Returns the full updated map.
 */
export async function saveAutoApprove(partial) {
  const { data } = await axios.put(`${SETTINGS_BASE}/auto-approve`, partial);
  return { ...EMPTY_AUTO_APPROVE, ...(data?.autoApprove || {}) };
}
