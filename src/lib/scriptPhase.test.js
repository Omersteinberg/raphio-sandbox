import { describe, it, expect } from "vitest";
import {
  isSessionPayload,
  isPreScriptWorking,
  REF_PRE_SCRIPT_STAGES,
  IMAGE_PRE_SCRIPT_STAGES,
} from "./scriptPhase";

describe("isSessionPayload", () => {
  // The bug this guards: the references pipeline awaited the session's SHARED job
  // slot with no expected type, so when the backend runner had already moved on it
  // resolved on REF_SCENE_FRAMES and assigned that job's result to `session`. The
  // result has no `stage`, so the stage-sync effect no-opped forever and the run
  // was pinned on "Writing script".
  it("rejects a scene-frames job result", () => {
    expect(isSessionPayload({ sceneFrames: [{ index: 0, url: "a.png" }] })).toBe(false);
  });

  it("rejects a lock/approve job result with no stage", () => {
    expect(isSessionPayload({ characters: [], settings: [], logos: [] })).toBe(false);
  });

  it("accepts a real session", () => {
    expect(isSessionPayload({ id: "abc", stage: "REF_SCRIPT_GENERATED", scriptData: { sections: [] } })).toBe(true);
  });

  it("rejects non-objects", () => {
    for (const v of [null, undefined, "REF_SCRIPT_GENERATED", 42, [{ stage: "x" }]]) {
      expect(isSessionPayload(v)).toBe(false);
    }
  });
});

describe("isPreScriptWorking", () => {
  it("is true while the session's job slot is RUNNING", () => {
    expect(isPreScriptWorking({ stage: "REF_SCRIPT_GENERATED", jobStatus: "RUNNING" }, REF_PRE_SCRIPT_STAGES)).toBe(true);
  });

  it("is true on a stage the backend has yet to leave", () => {
    expect(isPreScriptWorking({ stage: "REF_REFERENCES_LOCKED" }, REF_PRE_SCRIPT_STAGES)).toBe(true);
    expect(isPreScriptWorking({ stage: "RESTYLING" }, IMAGE_PRE_SCRIPT_STAGES)).toBe(true);
  });

  it("is false when nothing is in flight and nothing will advance the session", () => {
    expect(isPreScriptWorking({ stage: "REF_SCRIPT_APPROVED", jobStatus: "DONE" }, REF_PRE_SCRIPT_STAGES)).toBe(false);
  });

  // The wiped-session case: a payload with no stage must never read as "working",
  // or the overlay covers the only control that can advance the run.
  it("is false for a session that was never loaded, or was clobbered", () => {
    expect(isPreScriptWorking(null, REF_PRE_SCRIPT_STAGES)).toBe(false);
    expect(isPreScriptWorking({ sceneFrames: [] }, REF_PRE_SCRIPT_STAGES)).toBe(false);
  });
});
