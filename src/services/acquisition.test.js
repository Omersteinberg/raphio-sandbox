import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Anonymous acquisition tracking: session-scoped id + allow-listed UTM/ref
// capture, best-effort fetch to the backend. Covers the pieces most likely to
// silently regress - the allow-list (a stray param must never leak through),
// id persistence across calls, and the "storage/crypto unavailable" fallback
// that keeps this from ever throwing on a landing page.

function fakeSessionStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("sessionStorage", fakeSessionStorage());
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAnonymousId", () => {
  it("persists the same id across calls in the same session", async () => {
    const { getAnonymousId } = await import("./acquisition.js");
    const first = getAnonymousId();
    const second = getAnonymousId();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it("returns null when storage and crypto are both unavailable", async () => {
    vi.stubGlobal("sessionStorage", undefined);
    vi.stubGlobal("crypto", undefined);
    const { getAnonymousId } = await import("./acquisition.js");
    expect(getAnonymousId()).toBeNull();
  });
});

describe("captureAttribution / getAttribution", () => {
  it("keeps only allow-listed keys, trimmed and capped at 100 chars", async () => {
    const { captureAttribution } = await import("./acquisition.js");
    const search = `?utm_source=${"x".repeat(150)}&utm_medium=email&junk=drop&ref=friend`;
    const result = captureAttribution(search);
    expect(result).toEqual({ utm_source: "x".repeat(100), utm_medium: "email", ref: "friend" });
    expect(result.junk).toBeUndefined();
  });

  it("does not clear a previously stored attribution on a later view with no params", async () => {
    const { captureAttribution, getAttribution } = await import("./acquisition.js");
    captureAttribution("?utm_source=google");
    captureAttribution("");
    expect(getAttribution()).toEqual({ utm_source: "google" });
  });

  it("getAttribution returns {} when nothing was ever captured", async () => {
    const { getAttribution } = await import("./acquisition.js");
    expect(getAttribution()).toEqual({});
  });
});

describe("trackAcquisition", () => {
  it("posts the anonymous id, event, and current attribution to the telemetry endpoint", async () => {
    const { captureAttribution, trackAcquisition } = await import("./acquisition.js");
    captureAttribution("?utm_source=google&utm_campaign=spring");
    trackAcquisition("landing_cta_clicked", { cta: "hero" });
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/telemetry\/acquisition$/);
    expect(options.method).toBe("POST");
    expect(options.keepalive).toBe(true);
    const body = JSON.parse(options.body);
    expect(body.event).toBe("landing_cta_clicked");
    expect(body.cta).toBe("hero");
    expect(body.attribution).toEqual({ utm_source: "google", utm_campaign: "spring" });
    expect(body.anonymousId).toBeTruthy();
  });

  it("omits cta from the body when none is given", async () => {
    const { trackAcquisition } = await import("./acquisition.js");
    trackAcquisition("landing_viewed");
    await Promise.resolve();

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("cta");
  });

  it("never calls fetch when no anonymous id can be produced", async () => {
    vi.stubGlobal("sessionStorage", undefined);
    vi.stubGlobal("crypto", undefined);
    const { trackAcquisition } = await import("./acquisition.js");
    trackAcquisition("landing_viewed");
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
  });
});
