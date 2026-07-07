// User UI preferences, persisted in localStorage. Mirrors src/lib/tourState.js:
// a namespaced key + try/catch so a locked-down browser (storage disabled) never
// throws. The `:v1` suffix on each key lets us reset a preference after a future
// redesign by bumping the version.
//
// First use: "auto-approve" flags that let the video-creation wizard skip
// (auto-advance past) chosen review checkpoints. Every flag defaults OFF, which
// reproduces the normal manual flow.
const PREFIX = "merge:pref:";

export const PREF_KEYS = {
  autoApproveReferences: "autoApprove:references:v1",
  autoApproveScript: "autoApprove:script:v1",
  autoApproveBridges: "autoApprove:bridges:v1",
  autoApproveFrames: "autoApprove:frames:v1",
  autoApproveGenerate: "autoApprove:generate:v1",
};

export function getBoolPref(key) {
  try {
    return localStorage.getItem(PREFIX + key) === "1";
  } catch {
    return false; // storage unavailable — default OFF (normal manual flow)
  }
}

export function setBoolPref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, value ? "1" : "0");
  } catch {
    /* storage unavailable — ignore */
  }
}

// One-shot read of every auto-approve flag, shaped for the pipeline task builders
// and the auto-advance effects: { references, script, bridges, frames, generate }.
export function getAutoApprove() {
  return {
    references: getBoolPref(PREF_KEYS.autoApproveReferences),
    script: getBoolPref(PREF_KEYS.autoApproveScript),
    bridges: getBoolPref(PREF_KEYS.autoApproveBridges),
    frames: getBoolPref(PREF_KEYS.autoApproveFrames),
    generate: getBoolPref(PREF_KEYS.autoApproveGenerate),
  };
}
