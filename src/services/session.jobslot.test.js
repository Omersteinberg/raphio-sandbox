import { describe, it, expect, vi, beforeEach } from "vitest";

// A session has ONE job slot shared by every job type, and the backend pipeline
// runner drives the same session server-side, chaining the next job from each
// job's onDone. These tests pin the rule that keeps the two from colliding: a
// kickoff waits on the job the BACKEND says is running, never on "whatever is in
// the slot when we next look".
vi.mock("./api.js", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../lib/genLog.js", () => ({ logFailure: vi.fn(), logEvent: vi.fn(), logObserve: vi.fn() }));

const axios = (await import("./api.js")).default;
const { generateScript } = await import("./session.js");

beforeEach(() => {
  vi.clearAllMocks();
});

const jobStatuses = (...states) => {
  let i = 0;
  axios.get.mockImplementation(() => Promise.resolve({ data: states[Math.min(i++, states.length - 1)] }));
};

describe("generateScript against a shared job slot", () => {
  it("returns the session when our own job finishes", async () => {
    const session = { id: "s1", stage: "REF_SCRIPT_GENERATED", scriptData: { sections: [] } };
    axios.post.mockResolvedValue({ data: { jobStatus: "RUNNING", jobType: "GENERATE_SCRIPT" } });
    jobStatuses({ jobStatus: "DONE", jobType: "GENERATE_SCRIPT", result: session });

    await expect(generateScript("s1")).resolves.toEqual(session);
  });

  // The regression. The runner already held the slot, so POST /generate-script
  // started nothing and reported ITS job back. That job's DONE lasts ~200ms before
  // onDone claims the slot for the next one, so a 3s poll lands on the wrong job.
  // Resolving on that job handed back `{ sceneFrames }` as if it were the session,
  // which wiped `stage` and pinned the run on "Writing script" forever.
  it("does not return a foreign job's result when the runner's chain moves on", async () => {
    axios.post.mockResolvedValue({ data: { jobStatus: "RUNNING", jobType: "GENERATE_OUTLINE" } });
    jobStatuses(
      { jobStatus: "RUNNING", jobType: "GENERATE_OUTLINE", result: null },
      // GENERATE_OUTLINE's DONE was missed; the slot already holds the next job.
      { jobStatus: "DONE", jobType: "REF_SCENE_FRAMES", result: { sceneFrames: [{ index: 0 }] } },
    );

    await expect(generateScript("s1")).resolves.toBeNull();
  });

  it("waits on the runner's job when it is the one that owns the slot", async () => {
    const session = { id: "s1", stage: "REF_SCRIPT_GENERATED", scriptData: { sections: [] } };
    axios.post.mockResolvedValue({ data: { jobStatus: "RUNNING", jobType: "GENERATE_OUTLINE" } });
    jobStatuses(
      { jobStatus: "RUNNING", jobType: "GENERATE_OUTLINE", result: null },
      { jobStatus: "DONE", jobType: "GENERATE_OUTLINE", result: session },
    );

    await expect(generateScript("s1")).resolves.toEqual(session);
  });
});
