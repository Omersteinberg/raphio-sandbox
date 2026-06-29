// One-key localStorage helper to remember where the user was before a
// /buy-credits detour, so the post-checkout success screen can send them back
// to the exact wizard step. The wizard resumes from /create?session=...,
// and localStorage survives the same-tab Stripe round-trip (same origin).
const KEY = "merge:returnTo";

export function saveReturnTo(path) {
  try { localStorage.setItem(KEY, path); } catch { /* storage unavailable — ignore */ }
}

export function takeReturnTo() {
  try {
    const v = localStorage.getItem(KEY);
    if (v) localStorage.removeItem(KEY);
    return v || null;
  } catch {
    return null;
  }
}
