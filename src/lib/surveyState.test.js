import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { surveyDone, markSurveyDone } from "./surveyState";

// surveyState gates the post-video survey to once per finished video. The repo's
// default Vitest env is node (no DOM), so we stub a Map-backed localStorage to
// exercise the real read/write path, and a throwing one for the storage-disabled
// case (private mode / storage off must never throw and never block the survey).

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("surveyState", () => {
  describe("with working storage", () => {
    beforeEach(() => {
      vi.stubGlobal("localStorage", makeStorage());
    });

    it("is not done for a fresh session", () => {
      expect(surveyDone("sess-1")).toBe(false);
    });

    it("is done after markSurveyDone", () => {
      markSurveyDone("sess-1");
      expect(surveyDone("sess-1")).toBe(true);
    });

    it("isolates state per sessionId", () => {
      markSurveyDone("sess-1");
      expect(surveyDone("sess-1")).toBe(true);
      expect(surveyDone("sess-2")).toBe(false);
    });

    it("treats a missing sessionId as done (nothing to key on)", () => {
      expect(surveyDone(undefined)).toBe(true);
      expect(surveyDone(null)).toBe(true);
      expect(surveyDone("")).toBe(true);
    });

    it("markSurveyDone is a no-op without a sessionId", () => {
      expect(() => markSurveyDone(undefined)).not.toThrow();
      expect(surveyDone(undefined)).toBe(true);
    });
  });

  describe("with storage unavailable", () => {
    beforeEach(() => {
      vi.stubGlobal("localStorage", {
        getItem: () => {
          throw new Error("storage disabled");
        },
        setItem: () => {
          throw new Error("storage disabled");
        },
      });
    });

    it("surveyDone returns false instead of throwing", () => {
      expect(surveyDone("sess-1")).toBe(false);
    });

    it("markSurveyDone swallows the error", () => {
      expect(() => markSurveyDone("sess-1")).not.toThrow();
    });
  });
});
