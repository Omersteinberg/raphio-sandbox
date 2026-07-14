import { describe, it, expect } from "vitest";
import {
  isGenerationFailed,
  clearVideoFailure,
  deriveFailedStep,
  progressFromTasks,
  buildVideoTasks,
  buildScriptTasks,
  statusForRange,
} from "./progressTasks";

// The checklist the user stares at for the whole render. Every branch here decides what
// they are told when something breaks — and until the mock harness could script a
// mid-render failure, two of the four attribution branches below had never once executed
// in a running system.

const makeSection = (status = "COMPLETED") => ({ status });

const makeSession = ({ status = "PROCESSING", progressData = {}, sections = [], finalVideoUrl = null } = {}) => ({
  video: {
    status,
    finalVideoUrl,
    backgroundMusicEnabled: true,
    progressData,
    sections,
  },
});

describe("isGenerationFailed", () => {
  it("is true on the video status marker", () => {
    expect(isGenerationFailed(makeSession({ status: "FAILED" }))).toBe(true);
  });

  it("is true on the progressData marker alone", () => {
    expect(isGenerationFailed(makeSession({ progressData: { stage: "FAILED" } }))).toBe(true);
  });

  it("is false for a healthy run", () => {
    expect(isGenerationFailed(makeSession({ progressData: { stage: "GENERATING" } }))).toBe(false);
  });

  it("is false when there is no video row yet", () => {
    expect(isGenerationFailed({})).toBe(false);
    expect(isGenerationFailed(null)).toBe(false);
  });

  // The subtle one. claimGenerationLock clears the previous attempt's FAILED marker in
  // the same statement that flips the stage to GENERATING, so FAILED and GENERATING can
  // never coexist. This function therefore must NOT also require stage !== 'GENERATING':
  // doing so made a failure the backend had recorded but not yet rolled back invisible,
  // and the checklist spun forever.
  it("still reports a failure while the stage still reads GENERATING", () => {
    const session = makeSession({ status: "FAILED", progressData: { stage: "FAILED" } });
    session.stage = "GENERATING";
    expect(isGenerationFailed(session)).toBe(true);
  });
});

describe("clearVideoFailure", () => {
  it("clears a stale marker so a retry does not render under a red checklist", () => {
    const session = makeSession({ status: "FAILED", progressData: { stage: "FAILED", error: "boom" } });
    const cleared = clearVideoFailure(session);
    expect(cleared.video.status).toBe("PROCESSING");
    expect(cleared.video.progressData).toBeNull();
  });

  it("does not touch a session that has not failed", () => {
    const session = makeSession({ status: "PROCESSING" });
    expect(clearVideoFailure(session)).toBe(session);
  });

  it("does not mutate the input", () => {
    const session = makeSession({ status: "FAILED" });
    clearVideoFailure(session);
    expect(session.video.status).toBe("FAILED");
  });
});

describe("deriveFailedStep", () => {
  it("returns null when nothing has failed", () => {
    expect(deriveFailedStep(makeSession({ progressData: { stage: "GENERATING" } }))).toBeNull();
  });

  // BRANCH 1 — clips. Reachable only once a section can be marked FAILED mid-render.
  it("blames the clips row when a section failed", () => {
    const failure = deriveFailedStep(
      makeSession({
        status: "FAILED",
        progressData: { stage: "FAILED", error: "One of the video clips could not be generated." },
        sections: [makeSection("COMPLETED"), makeSection("FAILED")],
      }),
    );
    expect(failure).toMatchObject({ rowId: "clips", fatal: true });
    expect(failure.reason).toMatch(/clips/i);
  });

  // BRANCH 2 — assembly. Every clip landed, then ffmpeg died.
  it("blames the assembly row when every clip succeeded", () => {
    const failure = deriveFailedStep(
      makeSession({
        status: "FAILED",
        progressData: { stage: "FAILED", error: "ffmpeg exited with code 1" },
        sections: [makeSection("COMPLETED"), makeSection("COMPLETED")],
      }),
    );
    expect(failure).toMatchObject({ rowId: "assembly", fatal: true });
  });

  // BRANCH 3 — unattributable. The generic watchdog message means the worker died; an
  // assembly crash is indistinguishable from a TTS hang, so guessing a row would be a
  // lie to the user.
  it("refuses to guess a row under the generic stuck-worker message", () => {
    const failure = deriveFailedStep(
      makeSession({
        status: "FAILED",
        progressData: { stage: "FAILED", error: "Generation stopped unexpectedly. Please try again." },
        sections: [makeSection("COMPLETED"), makeSection("COMPLETED")],
      }),
    );
    expect(failure.rowId).toBeNull();
    expect(failure.fatal).toBe(true);
  });

  it("refuses to guess when the run died before any clip finished", () => {
    const failure = deriveFailedStep(
      makeSession({ status: "FAILED", progressData: { stage: "FAILED", error: "boom" }, sections: [] }),
    );
    expect(failure.rowId).toBeNull();
  });

  // BRANCH 4 — music is best-effort and must NOT fail the video.
  it("treats a failed music track as a non-fatal warning", () => {
    const failure = deriveFailedStep(
      makeSession({ status: "PROCESSING", progressData: { stage: "GENERATING", musicState: "failed" } }),
    );
    expect(failure).toMatchObject({ rowId: "music", fatal: false });
  });
});

describe("buildVideoTasks", () => {
  const scriptData = { sections: [{}, {}] };

  it("counts clips from the backend progress", () => {
    const { tasks } = buildVideoTasks(
      makeSession({ progressData: { stage: "GENERATING", completedClips: 1, totalClips: 3, totalTTS: 3, completedTTS: 1 } }),
      scriptData,
    );
    const clips = tasks.find((task) => task.id === "clips");
    expect(clips.description).toContain("1/3");
    expect(clips.status).toBe("processing");
  });

  // The forward clamp. Without it the wiped TTS counters make totalTTS fall back to 0,
  // which renders the narration row GREEN on a video that failed before narration ran.
  it("a fatal failure reds its row, greens what came before, and pends what never ran", () => {
    const { tasks } = buildVideoTasks(
      makeSession({
        status: "FAILED",
        progressData: { stage: "FAILED", error: "One of the video clips could not be generated." },
        sections: [makeSection("FAILED")],
      }),
      scriptData,
    );
    const byId = Object.fromEntries(tasks.map((task) => [task.id, task]));
    expect(byId.clips.status).toBe("failed");
    expect(byId.tts.status).toBe("pending");
    expect(byId.assembly.status).toBe("pending");
  });

  it("an assembly failure leaves the earlier rows green", () => {
    const { tasks } = buildVideoTasks(
      makeSession({
        status: "FAILED",
        progressData: { stage: "FAILED", error: "ffmpeg exited with code 1" },
        sections: [makeSection("COMPLETED")],
      }),
      scriptData,
    );
    const byId = Object.fromEntries(tasks.map((task) => [task.id, task]));
    expect(byId.clips.status).toBe("completed");
    expect(byId.assembly.status).toBe("failed");
  });

  it("a failed music track goes amber, not green — and does not fail the run", () => {
    const { tasks } = buildVideoTasks(
      makeSession({ progressData: { stage: "GENERATING", musicState: "failed" } }),
      scriptData,
    );
    const music = tasks.find((task) => task.id === "music");
    expect(music.status).toBe("warning");
    expect(tasks.find((task) => task.id === "assembly").status).not.toBe("failed");
  });

  it("drops the music row when music was skipped", () => {
    const { tasks } = buildVideoTasks(
      makeSession({ progressData: { stage: "GENERATING", musicState: "skipped" } }),
      scriptData,
    );
    expect(tasks.find((task) => task.id === "music")).toBeUndefined();
  });

  it("holds every row pending until generation actually starts", () => {
    const { tasks } = buildVideoTasks(makeSession(), scriptData, { started: false });
    expect(tasks.every((task) => task.status === "pending")).toBe(true);
  });

  it("greens everything once the final video exists", () => {
    const { tasks } = buildVideoTasks(
      makeSession({ status: "COMPLETED", finalVideoUrl: "https://x/v.mp4", progressData: { stage: "COMPLETED" } }),
      scriptData,
    );
    expect(tasks.every((task) => task.status === "completed")).toBe(true);
  });
});

describe("progressFromTasks", () => {
  it("is 0 for an empty list, not NaN", () => {
    expect(progressFromTasks([])).toEqual({ target: 0, ceiling: 0 });
  });

  it("weights rows by their share, not by count", () => {
    const { target } = progressFromTasks([
      { status: "completed", weight: 0.8 },
      { status: "pending", weight: 0.2 },
    ]);
    expect(target).toBeCloseTo(80);
  });

  it("counts a failed row as settled — the run is over, one way or another", () => {
    const { target } = progressFromTasks([
      { status: "completed", weight: 0.5 },
      { status: "failed", weight: 0.5 },
    ]);
    expect(target).toBeCloseTo(100);
  });

  it("the ceiling leads the target so the bar has somewhere to creep", () => {
    const { target, ceiling } = progressFromTasks([
      { status: "processing", weight: 1, partial: 0.25, partialStep: 0.25 },
    ]);
    expect(ceiling).toBeGreaterThan(target);
    expect(ceiling).toBeLessThanOrEqual(100);
  });

  it("never exceeds 100 even if partial overruns", () => {
    const { target, ceiling } = progressFromTasks([
      { status: "processing", weight: 1, partial: 5, partialStep: 5 },
    ]);
    expect(target).toBeLessThanOrEqual(100);
    expect(ceiling).toBeLessThanOrEqual(100);
  });
});

describe("statusForRange", () => {
  it("maps a progress value onto a sub-step band", () => {
    expect(statusForRange([20, 40], 10)).toBe("pending");
    expect(statusForRange([20, 40], 30)).toBe("processing");
    expect(statusForRange([20, 40], 40)).toBe("completed");
  });
});

describe("buildScriptTasks", () => {
  const subSteps = [
    { id: "session", label: "Creating session", range: [0, 20] },
    { id: "script", label: "Writing script", range: [20, 100] },
  ];

  it("gives each row a weight proportional to its band", () => {
    const tasks = buildScriptTasks(subSteps, 0);
    expect(tasks).toHaveLength(2);
    expect(tasks[1].weight).toBeGreaterThan(tasks[0].weight);
  });

  it("advances the rows as progress climbs", () => {
    expect(buildScriptTasks(subSteps, 50).map((task) => task.status)).toEqual(["completed", "processing"]);
    expect(buildScriptTasks(subSteps, 100).map((task) => task.status)).toEqual(["completed", "completed"]);
  });
});
