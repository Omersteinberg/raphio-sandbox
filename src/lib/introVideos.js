// First-visit tutorial video per surface. The bucket base is env-overridable so
// it can differ per environment, while still working with no env setup at all.
const BASE =
  import.meta.env.VITE_INTRO_VIDEO_BASE ||
  "https://storage.googleapis.com/merge-images/tutorial-videos";

export const INTRO_VIDEO_KEYS = {
  myVideos: "myVideos",
  modeChooser: "modeChooser",
  prompt: "prompt",
  image: "image",
  references: "references",
};

// There is no Raphio2.mp4. The numbering gap is intentional.
const FILES = {
  myVideos: "Raphio1.mp4",
  modeChooser: "Raphio3.mp4",
  prompt: "Raphio4.mp4",
  image: "Raphio5.mp4",
  references: "Raphio6.mp4",
};

const TITLES = {
  myVideos: "Welcome to your videos",
  modeChooser: "Getting started",
  prompt: "Creating a video from a prompt",
  image: "Creating a video from your photos",
  references: "Creating a video with references",
};

// Object.hasOwn, not truthiness: introVideoSrc("constructor") must be null.
export function introVideoSrc(key) {
  return Object.hasOwn(FILES, key) ? `${BASE}/${FILES[key]}` : null;
}

export function introVideoTitle(key) {
  return Object.hasOwn(TITLES, key) ? TITLES[key] : "";
}

// The single source of truth for both the modal and the tour gate. Pure and
// total. `tourEnabled` is the exact complement of `open` once ready, so a tour
// can never run behind an open modal, nor be lost after the modal closes.
export function resolveIntro({ key, ready, seen, src, dismissed }) {
  const open = Boolean(ready && src && !dismissed && !(seen || []).includes(key));
  return { open, tourEnabled: Boolean(ready) && !open };
}

// Turns raw auth state into resolveIntro's `ready` / `dismissed` inputs.
//
// `!loading` in `ready` is load-bearing. On the first render `user` is null and
// `loading` is true; treating that as ready would flip `tourEnabled` true and let
// useStepTour start its 350ms timer before auth resolved, running the tour and
// marking it seen before the video ever opened.
//
// A resolved-but-absent user is still ready, so a failed auth cannot freeze the
// tours forever, but it is suppressed, so we never open a video we cannot persist.
export function introGate({ user, loading, settingsReady, enabled, dismissed }) {
  return {
    ready: Boolean(settingsReady || (!loading && !user)),
    suppressed: Boolean(dismissed || !enabled || !user),
  };
}
