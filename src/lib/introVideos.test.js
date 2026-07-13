import { describe, expect, it } from "vitest";
import { INTRO_VIDEO_KEYS, introGate, introVideoSrc, introVideoTitle, resolveIntro } from "./introVideos";

const BASE = "https://storage.googleapis.com/merge-images/tutorial-videos";

describe("introVideoSrc", () => {
  it("maps every key to its asset", () => {
    expect(introVideoSrc("myVideos")).toBe(`${BASE}/Raphio1.mp4`);
    expect(introVideoSrc("modeChooser")).toBe(`${BASE}/Raphio3.mp4`);
    expect(introVideoSrc("prompt")).toBe(`${BASE}/Raphio4.mp4`);
    expect(introVideoSrc("image")).toBe(`${BASE}/Raphio5.mp4`);
    expect(introVideoSrc("references")).toBe(`${BASE}/Raphio6.mp4`);
  });

  it("returns null for an unknown key", () => {
    expect(introVideoSrc("nope")).toBeNull();
    expect(introVideoSrc(undefined)).toBeNull();
  });

  it("returns null for inherited Object keys", () => {
    expect(introVideoSrc("constructor")).toBeNull();
    expect(introVideoSrc("toString")).toBeNull();
  });
});

describe("introVideoTitle", () => {
  it("titles every key", () => {
    for (const key of Object.values(INTRO_VIDEO_KEYS)) {
      expect(introVideoTitle(key).length).toBeGreaterThan(0);
    }
  });

  it("returns an empty string for an unknown key", () => {
    expect(introVideoTitle("nope")).toBe("");
    expect(introVideoTitle("constructor")).toBe("");
  });
});

describe("INTRO_VIDEO_KEYS", () => {
  it("is a self-mapping of the five surfaces", () => {
    expect(INTRO_VIDEO_KEYS).toEqual({
      myVideos: "myVideos",
      modeChooser: "modeChooser",
      prompt: "prompt",
      image: "image",
      references: "references",
    });
  });

  it("has a video for every key", () => {
    for (const key of Object.values(INTRO_VIDEO_KEYS)) {
      expect(introVideoSrc(key)).toMatch(/\/Raphio\d+\.mp4$/);
    }
  });
});

describe("resolveIntro", () => {
  const base = { key: "myVideos", ready: true, seen: [], src: "x.mp4", dismissed: false };

  it("stays shut and holds the tour until settings are ready", () => {
    expect(resolveIntro({ ...base, ready: false })).toEqual({ open: false, tourEnabled: false });
  });

  it("opens when ready, unseen, undismissed, and a URL exists", () => {
    expect(resolveIntro(base)).toEqual({ open: true, tourEnabled: false });
  });

  it("stays shut and releases the tour when already seen", () => {
    expect(resolveIntro({ ...base, seen: ["myVideos"] })).toEqual({ open: false, tourEnabled: true });
  });

  it("ignores other keys in the seen list", () => {
    expect(resolveIntro({ ...base, seen: ["prompt", "image"] })).toEqual({ open: true, tourEnabled: false });
  });

  it("stays shut and releases the tour when there is no URL", () => {
    expect(resolveIntro({ ...base, src: null })).toEqual({ open: false, tourEnabled: true });
  });

  it("stays shut and releases the tour once dismissed, even if unseen", () => {
    expect(resolveIntro({ ...base, dismissed: true })).toEqual({ open: false, tourEnabled: true });
  });

  it("tolerates a missing seen list", () => {
    expect(resolveIntro({ ...base, seen: undefined })).toEqual({ open: true, tourEnabled: false });
  });

  it("keeps tourEnabled the exact complement of open whenever ready", () => {
    for (const seen of [[], ["myVideos"]]) {
      for (const src of ["x.mp4", null]) {
        for (const dismissed of [true, false]) {
          const r = resolveIntro({ key: "myVideos", ready: true, seen, src, dismissed });
          expect(r.tourEnabled).toBe(!r.open);
        }
      }
    }
  });

  it("never opens and never releases the tour while not ready", () => {
    for (const seen of [[], ["myVideos"]]) {
      for (const src of ["x.mp4", null]) {
        for (const dismissed of [true, false]) {
          const r = resolveIntro({ key: "myVideos", ready: false, seen, src, dismissed });
          expect(r).toEqual({ open: false, tourEnabled: false });
        }
      }
    }
  });

  it("returns booleans, never undefined or a truthy string", () => {
    const r = resolveIntro({ ...base, src: undefined, ready: undefined });
    expect(r.open).toBe(false);
    expect(r.tourEnabled).toBe(false);
  });
});

describe("introGate", () => {
  const authed = { user: { id: 1 }, loading: false, settingsReady: true, enabled: true, dismissed: false };

  // The regression this whole gate exists to prevent.
  it("is NOT ready while auth is still resolving, even though user is null", () => {
    expect(introGate({ ...authed, user: null, loading: true, settingsReady: false }).ready).toBe(false);
  });

  it("is not ready once auth resolves but settings have not", () => {
    expect(introGate({ ...authed, settingsReady: false }).ready).toBe(false);
  });

  it("is ready once settings load", () => {
    expect(introGate(authed).ready).toBe(true);
  });

  it("is ready, but suppressed, when auth resolves with no user", () => {
    const g = introGate({ ...authed, user: null, loading: false, settingsReady: false });
    expect(g).toEqual({ ready: true, suppressed: true });
  });

  it("suppresses when disabled, without regard to seen-state", () => {
    expect(introGate({ ...authed, enabled: false }).suppressed).toBe(true);
  });

  it("suppresses once dismissed", () => {
    expect(introGate({ ...authed, dismissed: true }).suppressed).toBe(true);
  });

  it("does not suppress a normal signed-in first visit", () => {
    expect(introGate(authed)).toEqual({ ready: true, suppressed: false });
  });

  it("returns booleans, never a user object", () => {
    const g = introGate(authed);
    expect(typeof g.ready).toBe("boolean");
    expect(typeof g.suppressed).toBe("boolean");
  });
});

describe("introGate composed with resolveIntro (the real page wiring)", () => {
  const run = (auth, { key = "myVideos", seen = [], enabled = true, dismissed = false } = {}) => {
    const { ready, suppressed } = introGate({ ...auth, enabled, dismissed });
    return resolveIntro({ key, ready, seen, src: introVideoSrc(key), dismissed: suppressed });
  };

  const resolving = { user: null, loading: true, settingsReady: false };
  const loaded = { user: { id: 1 }, loading: false, settingsReady: true };

  it("holds BOTH the video and the tour during the auth window", () => {
    expect(run(resolving)).toEqual({ open: false, tourEnabled: false });
  });

  it("opens the video and holds the tour on a first visit", () => {
    expect(run(loaded)).toEqual({ open: true, tourEnabled: false });
  });

  it("releases the tour after the video is dismissed", () => {
    expect(run(loaded, { dismissed: true })).toEqual({ open: false, tourEnabled: true });
  });

  it("releases the tour immediately for a returning user", () => {
    expect(run(loaded, { seen: ["myVideos"] })).toEqual({ open: false, tourEnabled: true });
  });

  it("releases the tour and shows nothing when the surface is disabled (resumed draft)", () => {
    expect(run(loaded, { enabled: false })).toEqual({ open: false, tourEnabled: true });
  });

  it("never opens a video it could not persist (auth resolved, no user)", () => {
    expect(run({ user: null, loading: false, settingsReady: false })).toEqual({ open: false, tourEnabled: true });
  });

  it("gives each of the five surfaces its own first visit", () => {
    for (const key of Object.values(INTRO_VIDEO_KEYS)) {
      expect(run(loaded, { key, seen: [] }).open).toBe(true);
      expect(run(loaded, { key, seen: [key] }).open).toBe(false);
    }
  });

  it("does not let one surface's seen-flag suppress another", () => {
    expect(run(loaded, { key: "image", seen: ["prompt"] }).open).toBe(true);
  });
});
