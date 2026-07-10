import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Sparkles, Image as ImageIcon, Film } from "lucide-react";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";
import ProgressChecklist from "@/components/session/ProgressChecklist";
import { useReferencesSession } from "@/hooks/session/useReferencesSession";
import { loadPending } from "@/lib/pendingSession";
import JourneyTimeline from "@/components/session/JourneyTimeline";
import { buildReferencesTasks } from "@/lib/journeyTasks";
import { buildVideoTasks } from "@/lib/progressTasks";
import { useAuth } from "@/hooks/useAuth";

// Step components
import PromptStep from "@/components/session/PromptStep";
import ReferenceLockStep from "@/components/session/ReferenceLockStep";
import ScriptStep from "@/components/session/ScriptStep";
import FrameGenerationStep from "@/components/session/FrameGenerationStep";
import VideoGenerationStep from "@/components/session/VideoGenerationStep";
import useSmoothProgress from "@/hooks/useSmoothProgress";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";

export default function ReferencesPipelineCreator({ onModeChange, onBackToChooser }) {
  const navigate = useNavigate();
  const session = useReferencesSession();

  const {
    step,
    direction,
    loading,
    error,
    sessionId,

    // Prompt step
    userPrompt,
    setUserPrompt,
    style,
    setStyle,
    styleOptions,
    targetDuration,
    setTargetDuration,
    aspectRatio,
    setAspectRatio,
    startReferencesSession,

    // References state
    references,
    setReferences,
    referenceData,
    lockLoading,
    approveAllReferences,
    regenerateReference,

    // Script step
    scriptData,
    setScriptData,
    editRequest,
    setEditRequest,
    editScriptWithAI,
    approveScript,

    // Frames step
    sceneFrames,
    framesLoading,
    framesError,
    generateFrames,
    regenerateFrameScript,
    approveFrames,
    deleteScene,

    // Voice step
    voiceId,
    setVoiceId,
    backgroundMusic,
    setBackgroundMusic,
    startGeneration,
    generationError,

    // Result step
    finalVideoUrl,
    enterEditingMode,
    reset,
    scriptProgress,
    generationProgress,

    // Editing step
    regenerateClip,
    regenerateNarration,
    reorderClips,
    reassembleVideo,
    deleteClip,
    refreshSession,

    // Navigation
    handleNext,
    goToStep,

    // Credits
    insufficientCredits,
    dismissInsufficientCredits,
  } = session;

  // Auto-approve (skip steps) preferences - loaded from the user's account (Settings page).
  // `settingsReady` matters: `autoApprove` defaults to all-false and is filled in two
  // network hops after mount, so any gate decided before it resolves is decided wrong.
  const { autoApprove: autoApprovePrefs, settingsReady } = useAuth();
  const maxStepRef = useRef(0);
  const attemptRef = useRef({ step: -1, keys: new Set() });
  // Set when the user navigates back to an earlier gate: from then on they drive the
  // wizard by hand rather than having it approve out from under them.
  const [autoDisabled, setAutoDisabled] = useState(false);
  // The gate whose auto-approve call failed. We never retry automatically (a retry
  // loop trips the backend rate limiter); we hand the step back to the user instead.
  const [failedGate, setFailedGate] = useState(null);

  // Derived during render (not in the effect) so the overlay never covers a manual
  // gate for the frame between stepping back and the effect latching `autoDisabled`.
  const steppedBack = step > 0 && step < maxStepRef.current;

  // The single predicate behind both the auto-approve effect and `atManualReview`.
  // If this is false for a gate, that gate MUST show its manual UI - otherwise the
  // merged-run overlay covers a button that nothing else is going to press.
  const autoActive = (key) =>
    settingsReady && !!autoApprovePrefs[key] && !steppedBack && !autoDisabled && failedGate !== key;
  const manualGate = (key) => settingsReady && !autoActive(key);

  // References are ready to approve once every one has a locked image and no lock
  // is still running - mirrors ReferenceLockStep's own `allLocked` check.
  const refLockReady = (() => {
    if (!referenceData) return false;
    const allRefs = [
      ...(referenceData.characters || []),
      ...(referenceData.settings || []),
      ...(referenceData.logos || []),
    ];
    return allRefs.length > 0 && allRefs.every((r) => r.lockedUrl) && (lockLoading?.size ?? 0) === 0;
  })();

  // Auto-advance past review gates the user chose to skip. Fires on forward progress
  // AND on a resumed session (a reload used to strand the run: the gate never fired
  // and its manual button was hidden behind the overlay). Never fires on a step-back.
  useEffect(() => {
    if (step === 0) {
      maxStepRef.current = 0;
      if (autoDisabled) setAutoDisabled(false);
      if (failedGate) setFailedGate(null);
      return;
    }
    if (step < maxStepRef.current) {
      if (!autoDisabled) setAutoDisabled(true);
      return;
    }
    maxStepRef.current = step;
    // Each arrival at a step gets one attempt per gate, so coming back around after
    // an edit can re-approve, while a single arrival can never double-fire.
    if (attemptRef.current.step !== step) attemptRef.current = { step, keys: new Set() };

    if (!settingsReady) return;
    if (loading || generationError || insufficientCredits) return;

    const run = (key, ready, fn) => {
      if (!ready || !autoActive(key) || attemptRef.current.keys.has(key)) return;
      attemptRef.current.keys.add(key);
      Promise.resolve(fn()).then(
        (ok) => { if (ok === false) setFailedGate(key); },
        () => setFailedGate(key)
      );
    };

    // Scene frames auto-generate on entry (below), so the frames gate only needs
    // to auto-approve once they're ready - which starts video generation.
    if (step === 1) run("references", refLockReady, approveAllReferences);
    else if (step === 2) run("script", !!scriptData, approveScript);
    else if (step === 3) run("frames", (sceneFrames?.length ?? 0) > 0, startGeneration);
    // Primitive pref deps: toggling an unrelated preference must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading, generationError, insufficientCredits, scriptData, referenceData, lockLoading, sceneFrames, framesLoading, settingsReady, autoDisabled, failedGate,
      autoApprovePrefs.references, autoApprovePrefs.script, autoApprovePrefs.frames]);

  // Scene frames generate automatically when you reach the frames step, so there's
  // no separate "Generate Scene Frames" click. Fires once per entry.
  const framesGenRef = useRef(false);
  useEffect(() => {
    if (step !== 3) {
      framesGenRef.current = false;
      return;
    }
    if (framesGenRef.current) return;
    if (framesLoading || (sceneFrames?.length ?? 0) > 0 || generationError) return;
    framesGenRef.current = true;
    generateFrames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, framesLoading, sceneFrames, generationError]);

  const journeyTasks = buildReferencesTasks({
    step,
    loading,
    scriptProgress,
    framesLoading,
    sceneFrames,
    session: session.session,
    finalVideoUrl,
    prefs: autoApprovePrefs,
  });

  // ONE persistent checklist across every phase (references -> script -> scenes ->
  // video): rows stack, title/icon change per phase, the page never swaps. It's
  // shown during every AUTOMATIC stretch and only steps aside when parked on a
  // review the user must act on - so consecutive auto phases read as one page,
  // and in full-auto it's one page the whole way through.
  // Card ticks follow REAL backend completion, not the wizard step counter. The
  // old step-based mapping only flipped "references" to done at the instant the
  // step advanced to "script", so the two appeared to tick together even though
  // references had actually finished earlier. Each phase now checks its own
  // completion signal; the `step >= N` fallbacks keep a card marked done if that
  // signal isn't loaded in this view (so it never regresses below the old logic).
  const REF_PHASE_ORDER = ["refs", "script", "scenes", "video"];
  const refDone = {
    refs: refLockReady || step >= 2,
    script: !!scriptData || step >= 3,
    scenes: (sceneFrames?.length ?? 0) > 0 || step >= 5,
    video: !!finalVideoUrl,
  };
  // The active (spinning) phase is the first one that isn't done yet.
  const refPhase = REF_PHASE_ORDER.find((p) => !refDone[p]) || "video";
  const refStatus = (p) => {
    if (refDone[p]) return "completed";
    return p === refPhase ? "processing" : "pending";
  };
  // The video phase reuses the shared buildVideoTasks helper - the SAME rows the
  // image and prompt pipelines show (clips, narration, music, assembly) - instead
  // of a single coarse "Generating video" card. This removes the duplicate music
  // logic that used to live here. `musicRequested` passes the wizard toggle so the
  // music card shows from the start, before the backend video row exists.
  const videoStarted = refPhase === "video";
  const { tasks: videoPhaseTasks } = buildVideoTasks(
    session.session,
    scriptData,
    { started: videoStarted, musicRequested: backgroundMusic }
  );
  const refMergedTasks = [
    { id: "refs", name: "Preparing references", description: "Locking in characters and settings", icon: Wand2, status: refStatus("refs") },
    { id: "script", name: "Writing script", description: "Turning your brief into a story", icon: Sparkles, status: refStatus("script") },
    { id: "scenes", name: "Creating scenes", description: "Designing a frame for each scene", icon: ImageIcon, status: refStatus("scenes") },
    ...videoPhaseTasks,
  ];
  const refMergedTitle =
    refPhase === "video" ? "Creating your video"
    : refPhase === "scenes" ? "Creating your scenes"
    : refPhase === "script" ? "Writing your script"
    : "Preparing your references";
  const refMergedIcon =
    refPhase === "video" ? Film
    : refPhase === "scenes" ? ImageIcon
    : refPhase === "script" ? Sparkles
    : Wand2;
  // Parked on a review the user must act on -> step aside and show that review.
  // `manualGate` (not the raw pref) is what decides: a gate whose auto-approve is
  // switched off, has already failed, or was reached by stepping back is a manual
  // gate, and the overlay must never cover it.
  const atManualReview =
    (step === 1 && !loading && refLockReady && manualGate("references")) ||
    (step === 2 && !loading && !!scriptData && manualGate("script")) ||
    (step === 3 && !framesLoading && (
      ((sceneFrames?.length ?? 0) > 0 && manualGate("frames")) ||
      framesError // only a genuine failure (not first entry) hands the screen to the retry UI
    ));
  const showRefMergedRun =
    step <= 5 &&
    (loading || framesLoading || (sessionId && step >= 1)) &&
    !atManualReview &&
    !generationError &&
    !insufficientCredits;

  // 12-minute ramp: the references run is longer than the image pipeline's
  // (references -> script -> scenes -> video), so the default 10 pins at the
  // ceiling too early.
  const refMergedProgress = useSmoothProgress({
    active: showRefMergedRun,
    done: !!finalVideoUrl,
    rampMs: 12 * 60 * 1000,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadPending("references");
        if (cancelled || !saved) return;
        if (saved.userPrompt) setUserPrompt(saved.userPrompt);
        if (saved.style) setStyle(saved.style);
        if (saved.references) {
          const rawRefs = Array.isArray(saved.references)
            ? saved.references
            : [
                ...(saved.references.characters || []).map(r => ({ ...r, type: r.type || 'character' })),
                ...(saved.references.settings || []).map(r => ({ ...r, type: r.type || 'setting' })),
                ...(saved.references.logos || []).map(r => ({ ...r, type: r.type || 'logo' })),
                ...(saved.references.products || []).map(r => ({ ...r, type: r.type || 'product' })),
              ];
          // Restore uploaded reference photos: convert the persisted base64 back
          // into a File so the preview shows and Create re-uploads it.
          const refs = await Promise.all(
            rawRefs.map(async (r) => {
              const { imageData, imageName, ...rest } = r;
              const ref = { ...rest, type: rest.type || 'character' };
              if (imageData) {
                try {
                  const response = await fetch(imageData);
                  const blob = await response.blob();
                  ref.referenceFile = new File([blob], imageName || 'reference.png', { type: blob.type });
                  ref.referenceImage = URL.createObjectURL(ref.referenceFile);
                } catch (e) {
                  console.warn("[ReferencesPipelineCreator] failed to restore reference image:", e);
                }
              }
              return ref;
            })
          );
          if (cancelled) return;
          setReferences(refs);
        }
      } catch (err) {
        console.warn("[ReferencesPipelineCreator] rehydrate failed:", err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (dir) => ({ zIndex: 0, x: dir < 0 ? 1000 : -1000, opacity: 0 }),
  };

  const transition = {
    x: { type: "spring", stiffness: 300, damping: 30 },
    opacity: { duration: 0.2 },
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <PromptStep
            pipelineMode="references"
            onModeChange={!sessionId ? onModeChange : undefined}
            onBackToChooser={!sessionId ? onBackToChooser : undefined}
            references={references}
            onReferencesChange={setReferences}
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            style={style}
            setStyle={setStyle}
            styleOptions={styleOptions}
            targetDuration={targetDuration}
            setTargetDuration={setTargetDuration}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
            backgroundMusic={backgroundMusic}
            setBackgroundMusic={setBackgroundMusic}
            onStart={startReferencesSession}
            loading={loading}
            error={error}
          />
        );

      case 1:
        return (
          <ReferenceLockStep
            referenceData={referenceData}
            lockLoading={lockLoading}
            onApproveAll={approveAllReferences}
            onRegenerate={regenerateReference}
            loading={loading}
          />
        );

      case 2:
        return (
          <ScriptStep
            pipelineMode="references"
            scriptData={scriptData}
            setScriptData={setScriptData}
            editRequest={editRequest}
            setEditRequest={setEditRequest}
            editScriptWithAI={editScriptWithAI}
            approveScript={approveScript}
            session={session.session}
            loading={loading}
            onNext={handleNext}
          />
        );

      case 3:
        return (
          <FrameGenerationStep
            sceneFrames={sceneFrames}
            scriptData={scriptData}
            framesLoading={framesLoading}
            onRegenerateScript={regenerateFrameScript}
            onApprove={approveFrames}
            onDelete={deleteScene}
            onGenerateFrames={generateFrames}
            error={error}
          />
        );

      case 5:
        return (
          <VideoGenerationStep
            session={session.session}
            scriptData={scriptData}
            generationError={generationError}
            onRegenerate={startGeneration}
          />
        );

      case 6:
        return (
          <ResultStep
            finalVideoUrl={finalVideoUrl}
            scriptData={scriptData}
            session={session.session}
            enterEditingMode={enterEditingMode}
            reset={reset}
          />
        );

      case 7:
        return (
          <EditingStep
            session={session.session}
            sessionId={sessionId}
            regenerateClip={regenerateClip}
            regenerateNarration={regenerateNarration}
            reorderClips={reorderClips}
            reassembleVideo={reassembleVideo}
            deleteClip={deleteClip}
            goToResult={() => goToStep(6)}
            refreshSession={refreshSession}
            loading={loading}
          />
        );

      default:
        return null;
    }
  };

  const showProgressBar = (step >= 1 && step <= 5) || showRefMergedRun;

  const REFERENCES_SUB_STEPS = [
    { id: "session",    label: "Setting up your session",    range: [0, 15]  },
    { id: "references", label: "Locking in your references", range: [15, 40] },
    { id: "characters", label: "Building your characters",   range: [40, 65] },
    { id: "scenes",     label: "Designing your scenes",       range: [65, 85] },
    { id: "script",     label: "Generating script",          range: [85, 100] },
  ];

  const SCRIPT_GEN_SUB_STEPS = [
    { id: "approve",  label: "Approving your references", range: [0, 20]  },
    { id: "analyze",  label: "Analyzing your images",     range: [20, 50] },
    { id: "story",    label: "Crafting your story",        range: [50, 80] },
    { id: "script",   label: "Generating your script",     range: [80, 100] },
  ];

  return (
    <div
      className="h-full flex flex-col font-figtree"
      style={{ background: "linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)" }}
    >
      {showProgressBar && (
        <JourneyTimeline
          tasks={journeyTasks}
          onStepClick={(t) => { if (t.navStep != null) goToStep(t.navStep); }}
        />
      )}

      <div className="flex-1 relative overflow-y-auto">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="absolute inset-0 flex"
          >
            <div className="w-full h-full">{renderStep()}</div>
          </motion.div>
        </AnimatePresence>

        {/* Fully-automatic run: one persistent checklist across all phases. */}
        {showRefMergedRun && (
          <motion.div
            key="ref-merged-run"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-40"
            style={{ background: "#F5F0EB" }}
          >
            {/* The leave hint shows from the script phase on: those phases are
                detached backend jobs (script, REF_SCENE_FRAMES, video) that keep
                running and that resume re-attaches to. It is withheld during the
                "refs" phase because the browser still chains generate-all ->
                restyle there, so leaving mid-phase means restyle never fires and
                the session strands at the lock step with unstyled references. */}
            <ProgressChecklist
              title={refMergedTitle}
              headerIcon={refMergedIcon}
              progress={refMergedProgress}
              tasks={refMergedTasks}
              onLeave={refPhase === "refs" ? undefined : () => navigate("/videos")}
            />
          </motion.div>
        )}
      </div>

      {!showRefMergedRun && loading && step !== 5 && step === 0 && (
        <ScriptLoadingScreen
          progress={scriptProgress}
          subSteps={REFERENCES_SUB_STEPS}
          estimate="~7 minutes"
          title="Preparing your references"
        />
      )}
      {!showRefMergedRun && loading && step !== 5 && step === 1 && (
        <ScriptLoadingScreen
          progress={scriptProgress}
          subSteps={SCRIPT_GEN_SUB_STEPS}
          estimate="~7 minutes"
        />
      )}
      {!showRefMergedRun && loading && step !== 5 && step !== 0 && step !== 1 && (
        <MergeLoadingOverlay
          text={
            step === 2 ? "Generating script..."
            : step === 3 ? "Generating frames..."
            : "Processing..."
          }
          estimate={
            step === 2 ? "~3 minutes"
            : step === 3 ? "~5 minutes"
            : null
          }
          progress={null}
        />
      )}

      {insufficientCredits && (
        <InsufficientCreditsModal
          required={insufficientCredits.required}
          available={insufficientCredits.available}
          onClose={dismissInsufficientCredits}
        />
      )}
    </div>
  );
}
