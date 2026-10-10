// Pure builders that turn a pipeline's current state into the task list fed to
// <JourneyTimeline />. Keeping this out of the components makes the mapping easy
// to reason about and keeps the stage->step logic in the hooks untouched.
//
// Task shape: { id, label, kind, state, progress?, navStep? }
//   kind 'input' | 'review' | 'auto'   (a 'review' flips to 'auto' when its
//        matching auto-approve preference is ON - that is the single place the
//        review->auto flip happens)
//   navStep: for manual (clickable) nodes, the wizard step to jump back to.
//
// `prefs` is the auto-approve map from the useAuth context: { references, script, bridges, frames, generate, storyboard }.

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
