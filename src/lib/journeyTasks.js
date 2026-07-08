// Pure builders that turn a pipeline's current state into the task list fed to
// <JourneyTimeline />. Keeping this out of the components makes the mapping easy
// to reason about and keeps the stage->step logic in the hooks untouched.
//
// Task shape: { id, label, kind, state, progress?, navStep? }
//   kind 'input' | 'review' | 'auto'   (a 'review' flips to 'auto' when its
//        matching auto-approve preference is ON — that is the single place the
//        review->auto flip happens)
//   navStep: for manual (clickable) nodes, the wizard step to jump back to.
//
// `prefs` is the auto-approve map from the useAuth context: { references, script, bridges, frames, generate }.

// Manual node state from the current step vs the step this node owns.
function manualState(step, ownStep) {
  if (step > ownStep) return "done";
  if (step === ownStep) return "active";
  return "pending";
}

// A review node that the user chose to auto-approve renders as an automatic task
// (spinner then check) instead of a clickable gate.
function reviewNode({ id, label, step, ownStep, skip }) {
  if (skip) {
    // skipped review -> automatic task
    const state = step > ownStep ? "done" : step === ownStep ? "running" : "pending";
    return { id, label, kind: "auto", state };
  }
  return { id, label, kind: "review", state: manualState(step, ownStep), navStep: ownStep };
}

// ---------------------------------------------------------------------------
// IMAGE pipeline (also serves prompt-only: no image nodes, bridges off).
// Steps: 0 Prompt, 1 Script review, [2 Bridges], framesStep Generate,
//        generatingStep Video, completedStep Result.
// ---------------------------------------------------------------------------
export function buildImageTasks({
  step,
  enableBridges = false,
  framesStep,
  generatingStep,
  session,
  finalVideoUrl,
  hasBridgeFailures = false,
  prefs = {},
}) {
  const tasks = [];

  // 1. Prompt (input)
  tasks.push({
    id: "prompt",
    label: "Prompt",
    kind: "input",
    state: step > 0 ? "done" : "active",
    navStep: 0,
  });

  // 2. Script = generation + review, as one node. It ticks done only after the
  //    script is approved (past step 1). Skippable via prefs.script.
  tasks.push(
    reviewNode({ id: "script", label: "Script", step, ownStep: 1, skip: !!prefs.script })
  );

  // 3. Bridges review (approveScript) — only when bridges enabled. Never
  //    auto-skipped while there are bridge failures the user must resolve.
  if (enableBridges) {
    tasks.push(
      reviewNode({
        id: "bridges",
        label: "Bridges",
        step,
        ownStep: 2,
        skip: !!prefs.bridges && !hasBridgeFailures,
      })
    );
  }

  // Generation is no longer its own step: approving the Script (or Bridges)
  // node configures frames and starts the render in one action, so there's no
  // separate "Generate" gate to show here. The frames screen still exists purely
  // as a failure/retry fallback, which the timeline doesn't need to advertise.

  // 4. Video generation (auto).
  const pct = session?.video?.progressData?.percentage;
  tasks.push({
    id: "videoGen",
    label: "Video",
    kind: "auto",
    state: finalVideoUrl ? "done" : step >= generatingStep ? "running" : "pending",
    progress: typeof pct === "number" ? pct : undefined,
  });

  return tasks;
}

// ---------------------------------------------------------------------------
// REFERENCES pipeline.
// Steps: 0 Prompt, 1 References lock, 2 Script review, 3 Frames (generate+approve),
//        4 Voice/Generate, 5 Generating, 6 Result.
// ---------------------------------------------------------------------------
export function buildReferencesTasks({
  step,
  session,
  finalVideoUrl,
  prefs = {},
}) {
  const tasks = [];

  // 1. Prompt (input)
  tasks.push({
    id: "prompt",
    label: "Prompt",
    kind: "input",
    state: step > 0 ? "done" : "active",
    navStep: 0,
  });

  // 2. References lock (approveAllReferences). Skippable via prefs.references.
  tasks.push(
    reviewNode({ id: "references", label: "References", step, ownStep: 1, skip: !!prefs.references })
  );

  // 3. Script = generation + review, as one node. Ticks done only after the
  //    script is approved (past step 2). Skippable via prefs.script.
  tasks.push(
    reviewNode({ id: "script", label: "Script", step, ownStep: 2, skip: !!prefs.script })
  );

  // 4. Scenes = scene-frame generation + the frames review, as one node. Ticks
  //    done only after the frames are approved (which starts video generation).
  //    Skippable via prefs.frames.
  tasks.push(
    reviewNode({ id: "scenes", label: "Scenes", step, ownStep: 3, skip: !!prefs.frames })
  );

  // 5. Video generation (auto).
  const pct = session?.video?.progressData?.percentage;
  tasks.push({
    id: "videoGen",
    label: "Video",
    kind: "auto",
    state: finalVideoUrl ? "done" : step >= 5 ? "running" : "pending",
    progress: typeof pct === "number" ? pct : undefined,
  });

  return tasks;
}

// ---------------------------------------------------------------------------
// INTRO pipeline. Steps: 0 Brief, 1 Script (approve+generate fused), 2 Generating,
// 3 Result. Only respects prefs.generate (the fused approveAndGenerate gate).
// ---------------------------------------------------------------------------
export function buildIntroTasks({
  step,
  loading,
  scriptProgress = 0,
  generatingStep,
  session,
  finalVideoUrl,
  prefs = {},
}) {
  const tasks = [];

  tasks.push({
    id: "brief",
    label: "Brief",
    kind: "input",
    state: step > 0 ? "done" : "active",
    navStep: 0,
  });

  tasks.push({
    id: "scriptGen",
    label: "Script",
    kind: "auto",
    state: step >= 1 ? "done" : loading ? "running" : "pending",
    progress: scriptProgress,
  });

  tasks.push(
    reviewNode({ id: "generate", label: "Generate", step, ownStep: 1, skip: !!prefs.generate })
  );

  const pct = session?.video?.progressData?.percentage;
  tasks.push({
    id: "videoGen",
    label: "Video",
    kind: "auto",
    state: finalVideoUrl ? "done" : step >= generatingStep ? "running" : "pending",
    progress: typeof pct === "number" ? pct : undefined,
  });

  return tasks;
}
