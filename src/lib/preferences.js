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
  // Last-used creation choices ("saved defaults") — auto-saved by the session
  // hooks, restored as the initial values for the next new video.
  lastStyle: "lastStyle:v1",
  lastDuration: "lastDuration:v1",
  lastAspectRatio: "lastAspectRatio:v1",
  lastVoiceId: "lastVoiceId:v1",
  lastMusic: "lastMusic:v1",
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

export function getJsonPref(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback; // storage unavailable or corrupt value
  }
}

export function setJsonPref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

// Hardcoded fallbacks matching the session hooks' historical initial state.
const CREATION_FALLBACKS = {
  style: "realistic",
  targetDuration: 30,
  aspectRatio: "16:9",
  voiceId: "adam",
  backgroundMusic: true,
};

const KNOWN_ASPECT_RATIOS = ["16:9", "9:16"];

// One-shot validated read of the saved creation defaults. Stale or corrupt
// storage can never crash the wizard: every field falls back independently.
export function getCreationDefaults() {
  const style = getJsonPref(PREF_KEYS.lastStyle, null);
  const duration = getJsonPref(PREF_KEYS.lastDuration, null);
  const aspect = getJsonPref(PREF_KEYS.lastAspectRatio, null);
  const voice = getJsonPref(PREF_KEYS.lastVoiceId, null);
  const music = getJsonPref(PREF_KEYS.lastMusic, null);
  return {
    style: typeof style === "string" && style ? style : CREATION_FALLBACKS.style,
    targetDuration:
      Number.isFinite(duration) && duration > 0 ? duration : CREATION_FALLBACKS.targetDuration,
    aspectRatio: KNOWN_ASPECT_RATIOS.includes(aspect) ? aspect : CREATION_FALLBACKS.aspectRatio,
    voiceId: typeof voice === "string" && voice ? voice : CREATION_FALLBACKS.voiceId,
    backgroundMusic: typeof music === "boolean" ? music : CREATION_FALLBACKS.backgroundMusic,
  };
}

// Write-through of the last-used choices; called from the session hooks'
// auto-save effects on every change.
export function saveCreationDefaults({ style, targetDuration, aspectRatio, voiceId, backgroundMusic }) {
  setJsonPref(PREF_KEYS.lastStyle, style);
  setJsonPref(PREF_KEYS.lastDuration, targetDuration);
  setJsonPref(PREF_KEYS.lastAspectRatio, aspectRatio);
  setJsonPref(PREF_KEYS.lastVoiceId, voiceId);
  setJsonPref(PREF_KEYS.lastMusic, backgroundMusic);
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
