import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";
import IntroBriefStep from "@/components/session/IntroBriefStep";
import IntroSceneReviewStep from "@/components/session/IntroSceneReviewStep";
import VideoGenerationStep from "@/components/session/VideoGenerationStep";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";
import ProviderUnavailableScreen from "@/components/session/ProviderUnavailableScreen";
import { useIntroSession } from "@/hooks/session/useIntroSession";
import JourneyTimeline from "@/components/session/JourneyTimeline";
import { buildIntroTasks } from "@/lib/journeyTasks";
import { useResolvedAutoApprove } from "@/hooks/useResolvedAutoApprove";
import { loadPending } from "@/lib/pendingSession";
import { MOCK_VIDEO_URL, MOCK_SCRIPT_DATA, mockSession } from "@/lib/mockGeneration";

const GENERATING_STEP = 2;
const COMPLETED_STEP = 3;
const EDITING_STEP = 4;

// Dev-only preview of Intro's video-render loading screen. Intro has no
// buildVideoTasks-shaped session of its own to reuse like the other
// pipelines' mocks do, so this is a richer fake than mockGeneration.js's
// shared helper (which only needs enough for VideoResult's display props,
// not clip/narration internals) - VideoGenerationStep derives its own
// progress from these fields via the SAME buildVideoTasks() it always uses,
// so the mock still can't drift from real rendering logic.
const MOCK_INTRO_VIDEO_SESSION = {
  id: "mock-preview",
  video: {
    sections: [
      { status: "COMPLETED" },
      { status: "COMPLETED" },
      { status: "PROCESSING" },
      { status: "PENDING" },
    ],
    progressData: { stage: "GENERATING", totalClips: 4, completedClips: 2, completedTTS: 3, totalTTS: 4 },
  },
};

// What the intro pipeline actually does, in the order it does it.
//
// ScriptLoadingScreen's own defaults describe the photo pipeline (uploading,
// analyzing and restyling images), none of which happens here, so an intro was
// claiming work it never did. The ranges are the percentages this pipeline really
// reports: useIntroSession ticks up to 20 by hand while the session is being set
// up, then hands the bar to the backend job, whose 0-100 is mapped onto 20-100.
// The backend's own milestones inside that are 5 for the plan, 15 for the stills,
// then the clip pass, which is 78% of what is left.
const INTRO_SUB_STEPS = [
  { id: "session", label: "Setting up your session",       range: [0, 12]  },
  { id: "upload",  label: "Uploading your logo and photos", range: [12, 20] },
  { id: "design",  label: "Designing your scenes",          range: [20, 32] },
  { id: "still",   label: "Drawing the first look",         range: [32, 42] },
  { id: "voice",   label: "Recording the voiceover",        range: [42, 48] },
  { id: "render",  label: "Rendering your scenes",          range: [48, 100] },
];

export default function IntroPipelineCreator({
  onModeChange,
  onChromeChange,
  onMergedRunActiveChange,
}) {
  const intro = useIntroSession();
  const { step, direction, loading } = intro;

  // Dev-only preview of the loading screens and the completion state, without
  // a real session or any billed backend/VEO/ElevenLabs call. Same design as
  // the other three pipelines' mocks - see ReferencesPipelineCreator.jsx for
  // the full rationale. Usage: /create?mode=intro&mockLoading=script|video|done
  const [searchParams] = useSearchParams();
  const mockLoadingParam = import.meta.env.DEV ? searchParams.get("mockLoading") : null;
  const isMockDone = mockLoadingParam === "done";
  const isMockLoading = !!mockLoadingParam && !isMockDone;
  const mockPhase = mockLoadingParam === "video" ? "video" : "script";

  // Whether an auto-progressing generation is in flight, reported up to
  // Creator.jsx (same reasoning/pattern as References' onMergedRunActiveChange:
  // a tab switch mid-run unmounts this component's useIntroSession() instance,
  // which is built on the same useSessionBase() ?session= URL sync as the
  // other pipelines, with no resume path).
  //
  // Intro has no unified "merged run" flag like showRefMergedRun/showMergedRun,
  // so this is assembled from its two genuinely async phases instead of using
  // `loading` alone: `loading` covers step 0 (building the scenes - a single
  // long awaited call) and the brief instant of approving at step 1, but
  // startIntroSession's approveAndGenerate explicitly clears `loading` BEFORE
  // kicking off the actual video render (see useIntroSession.js) - the entire
  // GENERATING_STEP render happens with `loading` false, tracked only by
  // polling `intro.session`. `loading && step >= 1` would therefore stop
  // protecting the single most expensive phase (the real video render) the
  // instant it actually starts, so GENERATING_STEP is included unconditionally.
  // Excludes failure/insufficient-credits states, same as the other pipelines'
  // videoFatal/generationError/insufficientCredits exclusions - nothing
  // autonomous is still running once one of those is showing.
  const isGeneratingIntro =
    isMockLoading ||
    (step <= GENERATING_STEP &&
      (loading || step === GENERATING_STEP) &&
      !intro.generationError &&
      !intro.failedSession &&
      !intro.insufficientCredits);

  // Reported value additionally covers the completion screen (step===
  // COMPLETED_STEP) and the ?mockLoading=done preview, so tabs keep hidden on
  // "Your Video is Ready!" too - they previously came back the instant
  // isGeneratingIntro went false there, even though nothing about the page's
  // chrome should change between "still generating" and "just finished".
  // isGeneratingIntro itself is left alone (still just "actively
  // generating"); JourneyTimeline's bare/onStepClick props keying off it are
  // unaffected since showProgressBar already excludes COMPLETED_STEP.
  //
  // isCompletionScreen stays broken out as its own name because it is the half
  // of hideCreatorChrome that is NOT "a run is in flight" - it is only folded
  // in below, not reported separately. It used to be its own upward report
  // (onCompletionActiveChange) driving a third header state; Creator's
  // showChrome covers that case already, so the report is gone and this is now
  // purely local. See ReferencesPipelineCreator.jsx's identical split.
  const isCompletionScreen = step === COMPLETED_STEP || isMockDone;
  const hideCreatorChrome = isGeneratingIntro || isCompletionScreen;
  useEffect(() => {
    onMergedRunActiveChange?.(hideCreatorChrome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideCreatorChrome]);
  useEffect(() => () => onMergedRunActiveChange?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rehydrate the brief the user was part-way through: a hard refresh, the bounce
  // to /buy-credits when they run out of credits, or switching pipeline mode and
  // coming back. Mirrors the same mount-time restore in ImagePipelineCreator and
  // ReferencesPipelineCreator; useIntroSession writes the draft on every change.
  //
  // Skipped when resuming a real session (?session=): that session's own stage
  // drives the wizard, and a stale brief has nothing left to fill in.
  const restoreBrief = intro.restoreBrief;
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("session")) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadPending("intro");
        if (cancelled || !saved) return;
        restoreBrief(saved);
      } catch (err) {
        console.warn("[IntroPipelineCreator] rehydrate failed:", err);
      }
    })();
    return () => { cancelled = true; };
    // Mount-only: hydrate once when the page loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-approve (skip steps) - Intro fuses approve+generate, so it only respects
  // the "Generate" preference. Loaded from the user's account. Only fires on
  // forward progress, never on resume.
  const { prefs: autoApprovePrefs, ready: settingsReady } = useResolvedAutoApprove(intro.session);
  const maxStepRef = useRef(0);
  const attemptRef = useRef({ step: -1, keys: new Set() });
  const [autoDisabled, setAutoDisabled] = useState(false);

  // Fires on forward progress AND on a resumed session; never on a step-back.
  // `settingsReady` gates it because `autoApprove` defaults to all-false and only
  // resolves two network hops after mount.
  useEffect(() => {
    if (step === 0) {
      maxStepRef.current = 0;
      if (autoDisabled) setAutoDisabled(false);
      return;
    }
    if (step < maxStepRef.current) {
      if (!autoDisabled) setAutoDisabled(true);
      return;
    }
    maxStepRef.current = step;
    if (attemptRef.current.step !== step) attemptRef.current = { step, keys: new Set() };

    if (!settingsReady || autoDisabled) return;
    // reworkingIndexes is checked separately from `loading`, which a rework
    // deliberately does not set. clipsReady stays true through a rework (the revised
    // scene keeps its old clipUrl in local state until the job returns), so without
    // this a user with auto-approve on would have the video generated out from under
    // an in-flight rework.
    if (loading || intro.reworkingIndexes?.length || intro.error || intro.insufficientCredits) return;

    // One stage again: the scenes arrive already rendered, so there is nothing to
    // generate before approving. Gated on every clip existing, because approve is
    // rejected by the backend until they do.
    const clipsReady = intro.introScript?.scenes?.length
      && intro.introScript.scenes.every((s) => s?.clipUrl);
    if (step === 1 && clipsReady && autoApprovePrefs.generate && !attemptRef.current.keys.has("generate")) {
      attemptRef.current.keys.add("generate");
      intro.approveAndGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading, intro.reworkingIndexes, intro.error, intro.insufficientCredits, intro.introScript, settingsReady, autoDisabled, autoApprovePrefs.generate]);

  // JourneyTimeline gating (and the checklist it feeds) key off the real
  // `step` from useIntroSession, which the mock branches never advance - they
  // short-circuit rendering without touching it, so it sits at 0 for the
  // whole preview and showProgressBar never turns on. That's a gap in the
  // mock, not real behavior: a real generation genuinely reaches step 1
  // (script/generate review) and GENERATING_STEP (the video render), where
  // showProgressBar is legitimately true, same as the other three pipelines.
  // displayStep substitutes a step for mock rendering only, so the mock
  // matches what a real run looks like at that phase.
  const displayStep = isMockLoading ? (mockPhase === "video" ? GENERATING_STEP : 1) : step;

  const journeyTasks = buildIntroTasks({
    step: displayStep,
    loading,
    scriptProgress: intro.scriptProgress,
    generatingStep: GENERATING_STEP,
    session: intro.session,
    finalVideoUrl: intro.finalVideoUrl,
    prefs: autoApprovePrefs,
  });

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (d) => ({ zIndex: 0, x: d < 0 ? 1000 : -1000, opacity: 0 }),
  };
  const transition = { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } };

  const renderStep = () => {
    if (step === 0) {
      return (
        <IntroBriefStep
          {...intro}
          onContinue={intro.startIntroSession}
          onModeChange={!intro.sessionId ? onModeChange : undefined}
        />
      );
    }
    if (step === 1) {
      return (
        <IntroSceneReviewStep
          introScript={intro.introScript}
          updateScriptField={intro.updateScriptField}
          saveScriptEdits={intro.saveScriptEdits}
          voiceId={intro.voiceId}
          setVoiceId={intro.setVoiceId}
          reviseScenes={intro.reviseScenes}
          approveAndGenerate={intro.approveAndGenerate}
          loading={loading}
          reworkingIndexes={intro.reworkingIndexes}
          reworkLabel={intro.reworkLabel}
          aspectRatio={intro.aspectRatio}
        />
      );
    }
    if (step === GENERATING_STEP) {
      return (
        <VideoGenerationStep
          session={intro.session}
          failedSession={intro.failedSession}
          scriptData={null}
          openingFrame={null}
          closingFrame={null}
          generationError={intro.generationError}
          onRegenerate={intro.approveAndGenerate}
        />
      );
    }
    if (step === COMPLETED_STEP) {
      return (
        <ResultStep
          finalVideoUrl={intro.finalVideoUrl || intro.session?.video?.finalVideoUrl || null}
          scriptData={null}
          session={intro.session}
          enterEditingMode={intro.enterEditingMode}
          reset={intro.reset}
        />
      );
    }
    if (step === EDITING_STEP) {
      // Same timeline editor the other pipelines drop into. An assembled intro
      // now carries one section per scene, so there are real per-beat clips here
      // rather than the single whole-video clip it used to show.
      return (
        <EditingStep
          session={intro.session}
          sessionId={intro.sessionId}
          updateClip={intro.updateClip}
          regenerateNarration={intro.regenerateNarration}
          // Flip the stage back BEFORE moving, not after. The stage-sync effect
          // maps EDITING to this step, so leaving the session reading EDITING and
          // stepping away by hand just bounces the user straight back into the
          // editor on the next session refresh.
          goToResult={async () => {
            await intro.completeSession();
            intro.goToStep(COMPLETED_STEP);
          }}
          refreshSession={intro.refreshSession}
          loading={loading}
        />
      );
    }
    return null;
  };

  const showProgressBar = displayStep > 0 && displayStep <= GENERATING_STEP;

  // See ImagePipelineCreator: composer (brief) step, nothing running -> hero +
  // tabs stay up and the step flows in the page scroll.
  const composerChrome = step === 0 && !loading && !intro.providerUnavailable;
  // The finished-video screen flows too; EDITING_STEP keeps the fixed frame.
  const flowLayout = composerChrome || step === COMPLETED_STEP;
  useLayoutEffect(() => { onChromeChange?.(composerChrome, flowLayout); },
    [composerChrome, flowLayout, onChromeChange]);

  // Short-circuits straight to the completion screen with fake data - see
  // ReferencesPipelineCreator.jsx's identical branch for the full rationale.
  // Deliberately below the useLayoutEffect above, never above it: this is an
  // early return, so a hook placed after it would be skipped whenever
  // ?mockLoading=done is set and React would throw on the hook-count change.
  if (isMockDone) {
    return (
      <div className="h-full flex flex-col font-figtree">
        <ResultStep
          finalVideoUrl={MOCK_VIDEO_URL}
          scriptData={MOCK_SCRIPT_DATA}
          session={mockSession()}
          enterEditingMode={intro.enterEditingMode}
          reset={intro.reset}
          showSurvey={false}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-figtree">
      {/* Presentational-only (no onStepClick, bare chrome) while a generation is
          in flight - same reasoning/pattern as the other three pipelines: a
          completed step's action is forward-only and side-effecting, and the
          tabs/full header that used to justify the stepper's own band are
          already hidden in this state (Creator.jsx's isMergedRunActive). Still
          clickable with its normal band on the Brief/Scene-review steps. */}
      {showProgressBar && (
        <JourneyTimeline
          tasks={journeyTasks}
          onStepClick={isGeneratingIntro ? undefined : (t) => { if (t.navStep != null) intro.goToStep(t.navStep); }}
          bare={isGeneratingIntro}
        />
      )}

      {/* flowLayout drops the height cap and the self-scrolling frame wherever
          the step is meant to flow in the page. Generation is deliberately NOT
          one of those (composerChrome, and so flowLayout, is false during it):
          it keeps the fixed frame, and there is no header sibling left up in
          Creator.jsx for that frame to strand, since showChrome hides the whole
          row for the duration of the run. */}
      <div className={flowLayout ? "relative" : "flex-1 relative overflow-hidden"}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition} className={flowLayout ? "w-full flex" : "absolute inset-0 flex"}>
            {/* mockLoading=video swaps in VideoGenerationStep directly, fed a
                fake session - it derives its own progress from that via the
                SAME buildVideoTasks() it always uses, so nothing here forks
                real rendering logic, only the input data. */}
            <div className="w-full h-full">
              {isMockLoading && mockPhase === "video" ? (
                <VideoGenerationStep
                  session={MOCK_INTRO_VIDEO_SESSION}
                  failedSession={null}
                  scriptData={null}
                  openingFrame={null}
                  closingFrame={null}
                  generationError={null}
                  onRegenerate={() => {}}
                />
              ) : (
                renderStep()
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Planning and rendering the scenes, and approving them into a video. Both
            are whole-pipeline waits with nothing else to look at. A rework is not
            here on purpose: it is scoped to the cards it changes, so it spins on
            those and leaves the rest of the step usable. */}
        <AnimatePresence>
          {(isMockLoading && mockPhase === "script") || (loading && (step === 0 || step === 1)) ? (
            <ScriptLoadingScreen
              progress={isMockLoading ? 45 : intro.scriptProgress}
              subSteps={INTRO_SUB_STEPS}
              title={isMockLoading ? "Building your scenes" : (intro.scriptLabel || "Building your scenes")}
              estimate="~10 minutes"
            />
          ) : null}
        </AnimatePresence>

        {intro.providerUnavailable && (
          <ProviderUnavailableScreen
            message={intro.providerUnavailable.message}
            loading={loading}
            onRetry={intro.startIntroSession}
            onDismiss={intro.dismissProviderUnavailable}
          />
        )}
      </div>

      {intro.insufficientCredits && (
        <InsufficientCreditsModal
          required={intro.insufficientCredits.required}
          available={intro.insufficientCredits.available}
          onClose={intro.dismissInsufficientCredits}
        />
      )}
    </div>
  );
}
