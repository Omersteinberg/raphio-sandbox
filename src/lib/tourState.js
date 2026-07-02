// "Show once" persistence for interactive product tours. Mirrors the
// src/lib/returnTo.js style: a namespaced key + try/catch so a locked-down
// browser (storage disabled) never throws. The `:v1` suffix on each key lets us
// re-show a tour after a future redesign by bumping the version.
const PREFIX = "merge:tour:";

export const TOUR_KEYS = {
  editorOverview: "editorOverview:v1",
  editorClip: "editorClip:v1",
  myVideos: "myVideos:v1",
};

export function tourSeen(key) {
  try {
    return localStorage.getItem(PREFIX + key) === "1";
  } catch {
    return false; // storage unavailable — treat as not seen (tour may re-show, harmless)
  }
}

export function markTourSeen(key) {
  try {
    localStorage.setItem(PREFIX + key, "1");
  } catch {
    /* storage unavailable — ignore */
  }
}

// Re-arm a tour so it will run again (used when replaying from the tour button).
export function clearTourSeen(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable — ignore */
  }
}
