import { describe, it, expect } from "vitest";
import { getStageToStep } from "./stageToStep";
import { resumeModeFor, RESUMABLE_MODES } from "./pipelineMode";

// Resume correctness. Both of these decide where a returning user lands, and both have
// already caused a real regression by omission rather than by a wrong value.

describe("getStageToStep", () => {
  // The caller does `stageMap[stage] ?? 0`. So a stage the backend can persist but this
  // map does not know about does not "fall through harmlessly" — it silently sends the
  // user back to step 0, where their session looks empty and lost. RESTYLING is exactly
  // that bug: it was missing, and sessions parked there vanished from the wizard.
  const BACKEND_STAGES = [
    "PROMPT_ENTERED",
    "IMAGES_UPLOADED",
    "RESTYLING",
    "IMAGES_ANALYZED",
    "OUTLINE_GENERATED",
    "SCRIPT_GENERATED",
    "SCRIPT_APPROVED",
    "FRAMES_CONFIGURED",
    "GENERATING",
    "COMPLETED",
    "EDITING",
  ];

  for (const bridges of [false, true]) {
    describe(bridges ? "with bridges" : "without bridges", () => {
      const map = getStageToStep(bridges);

      it("has an entry for EVERY stage the backend can persist", () => {
        for (const stage of BACKEND_STAGES) {
          expect(map[stage], `stage "${stage}" is missing — a resuming user is sent to step 0`).toBeTypeOf("number");
        }
      });

      it("never maps a real stage to step 0", () => {
        // Step 0 is the prompt screen. No persisted stage should land there: by the time
        // a stage exists the user has already left it.
        for (const stage of BACKEND_STAGES) {
          expect(map[stage], `"${stage}" maps to the prompt step`).toBeGreaterThan(0);
        }
      });

      it("never moves backwards as the pipeline advances", () => {
        let previous = 0;
        for (const stage of BACKEND_STAGES) {
          expect(map[stage], `"${stage}" goes backwards`).toBeGreaterThanOrEqual(previous);
          previous = map[stage];
        }
      });

      it("parks the whole pre-script phase on the script step", () => {
        // Everything from the prompt to the generated outline is one screen to the user.
        expect(map.IMAGES_UPLOADED).toBe(map.RESTYLING);
        expect(map.RESTYLING).toBe(map.IMAGES_ANALYZED);
        expect(map.IMAGES_ANALYZED).toBe(map.OUTLINE_GENERATED);
      });
    });
  }

  it("bridges inserts exactly one extra step, shifting everything after it", () => {
    const off = getStageToStep(false);
    const on = getStageToStep(true);

    expect(on.SCRIPT_GENERATED).toBe(off.SCRIPT_GENERATED);
    for (const stage of ["SCRIPT_APPROVED", "FRAMES_CONFIGURED", "GENERATING", "COMPLETED", "EDITING"]) {
      expect(on[stage], `${stage} should shift by exactly 1 when bridges are on`).toBe(off[stage] + 1);
    }
  });

  it("an unknown stage is undefined, so the caller's ?? 0 fallback is the only default", () => {
    expect(getStageToStep(false).NOT_A_STAGE).toBeUndefined();
  });
});

describe("resumeModeFor", () => {
  it("returns null when the URL already agrees with the session", () => {
    expect(resumeModeFor("image", "image")).toBeNull();
    expect(resumeModeFor("references", "references")).toBeNull();
  });

  it("corrects the URL when it disagrees", () => {
    expect(resumeModeFor("references", "image")).toBe("references");
    expect(resumeModeFor("image", "references")).toBe("image");
  });

  // prompt and image share ImagePipelineCreator, so it is tempting to treat them as the
  // same mode. They are not: the mode param drives promptOnly, which hides the photo grid.
  // Resuming a prompt session under ?mode=image renders the wrong wizard.
  it("corrects prompt vs image even though they share a creator", () => {
    expect(resumeModeFor("prompt", "image")).toBe("prompt");
    expect(resumeModeFor("image", "prompt")).toBe("image");
  });

  it("defaults a session with no pipelineMode to image", () => {
    expect(resumeModeFor(null, "image")).toBeNull();
    expect(resumeModeFor(undefined, "references")).toBe("image");
  });

  it("returns null for a non-resumable mode, so the caller loads it as-is", () => {
    // A mode Creator does not mount must not bounce the URL, or the resume lands
    // on nothing. Every mode in RESUMABLE_MODES has a creator behind it.
    expect(resumeModeFor("nonsense", "image")).toBeNull();
  });

  it("resumes Brand Intro sessions into their own pipeline", () => {
    // intro has its own creator (IntroPipelineCreator). Dropping it from
    // RESUMABLE_MODES silently strands every in-flight intro session in the
    // image wizard, which is what happened while the pipeline was hidden.
    expect(RESUMABLE_MODES).toContain("intro");
    expect(resumeModeFor("intro", "image")).toBe("intro");
    expect(resumeModeFor("intro", "intro")).toBeNull();
  });

  it("corrects a missing mode param (the WelcomeHero entry point)", () => {
    // Entry points that omit &mode= fall back to the last-selected mode in localStorage,
    // which loads the session into the wrong wizard. A non-null result here is what
    // stops that.
    expect(resumeModeFor("references", undefined)).toBe("references");
    expect(resumeModeFor("prompt", null)).toBe("prompt");
  });
});
