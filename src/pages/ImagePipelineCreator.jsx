import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Sparkles, Images } from "lucide-react";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import { useSession } from "@/hooks/session/useSession";
import { loadPending } from "@/lib/pendingSession";
import JourneyTimeline from "@/components/session/JourneyTimeline";
import ProgressChecklist from "@/components/session/ProgressChecklist";
import { buildImageTasks } from "@/lib/journeyTasks";
import { buildScriptTasks, buildVideoTasks, progressFromTasks, BRIDGE_PHASE_WEIGHT } from "@/lib/progressTasks";
import { useResolvedAutoApprove } from "@/hooks/useResolvedAutoApprove";
import { logObserve } from "@/lib/genLog";
import { loadSavedFrames, hydrateFrameConfig } from "@/lib/savedFrames";

// Step components
import PromptStep from "@/components/session/PromptStep";
import ScriptStep from "@/components/session/ScriptStep";
import FramesStep from "@/components/session/FramesStep";
import VideoGenerationStep from "@/components/session/VideoGenerationStep";
import useSmoothProgress from "@/hooks/useSmoothProgress";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";

// Sub-steps for the ScriptLoadingScreen in prompt-only mode: there's no photo
// upload / analyze / restyle, so those default labels would be nonsensical.
const PROMPT_ONLY_SUB_STEPS = [
  { id: "session", label: "Setting up your session", range: [0, 20] },
  { id: "story",   label: "Planning your story",     range: [20, 55] },
  { id: "script",  label: "Writing your script",     range: [55, 100] },
];

// How long the script step must look idle before we treat it as a real deadlock and
// uncover the manual button. Longer than the backend's job-to-job handoff, shorter
// than a user's patience.
const SCRIPT_STUCK_GRACE_MS = 8000;

// Script-phase rows for the merged full-auto checklist (photos flow).
const IMAGE_SCRIPT_SUB_STEPS = [
  { id: "session", label: "Setting up your session", range: [0, 15]  },
  { id: "upload",  label: "Uploading your images",   range: [15, 40] },
  { id: "analyze", label: "Analyzing images",         range: [40, 55] },
  { id: "restyle", label: "Restyling images",         range: [55, 70] },
  { id: "script",  label: "Generating script",        range: [70, 100] },
];

export default function ImagePipelineCreator({ mode = "image", onModeChange, onBackToChooser }) {
  const isPromptOnly = mode === "prompt";
  const navigate = useNavigate();
  const session = useSession({ promptOnly: isPromptOnly });

  const {
    step,
    direction,
    loading,
    handlePrev,
    sessionRestoring,

    // Prompt step
    userPrompt,
    setUserPrompt,
    style,
    setStyle,
    targetDuration,
    setTargetDuration,
    aspectRatio,
    setAspectRatio,
    startSession,
    styleOptions,
    enableBridges,
    setEnableBridges,
    extendPhotos,
    setExtendPhotos,

    // Images (from prompt)
    images,
    addImages,
    removeImage,
    reorderImages,
    setImageLabels,

    // Script step
    scriptData,
    setScriptData,
    editRequest,
    setEditRequest,
    generateScript,
    editScriptWithAI,
    approveScript,
    approveOutline,
    retryBridgeFrames,
    uploadBridgeImage,
    scriptGenFailed,

    // Frames step
    openingFrame,
    setOpeningFrame,
    closingFrame,
    setClosingFrame,
    generatedFrameImages,
    voiceId,
    setVoiceId,
    backgroundMusic,
    setBackgroundMusic,
    configureFrames,
    startGeneration,
    generationError,
    failedSession,

    // Result step
    finalVideoUrl,
    enterEditingMode,
    reset,
    scriptProgress,
    bridgeProgress,

    // Editing step
    updateClip,
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

  // Rehydrate pending inputs after a credit-driven redirect
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadPending("image");
        if (cancelled || !saved) return;
        if (saved.userPrompt) setUserPrompt(saved.userPrompt);
        if (saved.style) setStyle(saved.style);
        if (Array.isArray(saved.images) && saved.images.length > 0) {
          // Support both raw File entries and base64 entries.
          const files = await Promise.all(
            saved.images
              .filter((entry) => entry && (entry.file || entry.dataUrl))
              .map(async (entry) => {
                if (entry.file) return entry.file;

                const response = await fetch(entry.dataUrl);
                const blob = await response.blob();
                return new File([blob], entry.name || "image.png", {
                  type: blob.type,
                });
              })
          );
          if (files.length > 0) addImages(files);
        }
        // Restore saved frame defaults. Skipped when resuming an existing
        // session (?session=): the session's own frames load from the
        // backend. The pending draft above doesn't carry frames, so there is
        // no overlap; draft prompt/style still win over saved defaults.
        if (!new URLSearchParams(window.location.search).has("session")) {
          const savedFrames = await loadSavedFrames();
          if (!cancelled && savedFrames.opening) {
            const config = await hydrateFrameConfig(savedFrames.opening);
            if (!cancelled) setOpeningFrame(config);
          }
          if (!cancelled && savedFrames.closing) {
            const config = await hydrateFrameConfig(savedFrames.closing);
            if (!cancelled) setClosingFrame(config);
          }
        }
      } catch (err) {
        console.warn("[ImagePipelineCreator] rehydrate failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only: hydrate once when the page loads. Setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Approve & Generate": the frames/voice review screen was merged into the
  // script step, so approving the final script now configures frames and kicks
  // off generation in one action. Landing back on the frames step only happens
  // on failure (e.g. insufficient credits), where FramesStep's button retries.
  // Each step is guarded on the previous one's success (the approve/configure
  // handlers return a boolean) so a failed approve never triggers generation.
  const generateNow = async () => {
    const configured = await configureFrames();
    if (configured) await startGeneration();
  };
  const approveOutlineAndGenerate = async () => {
    const ok = await approveOutline();
    // Bridges mode still stops at the bridge-review step after approving.
    if (ok && !enableBridges) await generateNow();
  };
  const approveScriptAndGenerate = async () => {
    const ok = await approveScript();
    if (ok) await generateNow();
  };

  // Animation variants
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const transition = {
    x: { type: "spring", stiffness: 300, damping: 30 },
    opacity: { duration: 0.2 },
  };

  // Step offsets shift when bridges are disabled
  const framesStep = enableBridges ? 3 : 2;
  const generatingStep = enableBridges ? 4 : 3;
  const completedStep = enableBridges ? 5 : 4;
  const editingStep = enableBridges ? 6 : 5;

  // Auto-approve (skip steps) preferences. Resolved from the session's own snapshot
  // when it has one, so a preference toggled mid-run cannot change how this run
  // resumes, and the journey checklist below reads the exact flags the gates obey.
  const { prefs: autoApprovePrefs, ready: settingsReady, source: prefsSource } =
    useResolvedAutoApprove(session.session);
  const maxStepRef = useRef(0);
  const attemptRef = useRef({ step: -1, keys: new Set() });
  const [autoDisabled, setAutoDisabled] = useState(false);
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

    const backend = session.session;
    const run = (key, ready, fn) => {
      const active = autoActive(key);
      const attempted = attemptRef.current.keys.has(key);
      logObserve(`${session.sessionId}:gate:${key}`, "client.autoapprove.gate", {
        sessionId: session.sessionId,
        key,
        step,
        ready: !!ready,
        autoActive: active,
        alreadyAttempted: attempted,
        pref: !!autoApprovePrefs[key],
        prefsSource,
        steppedBack,
        autoDisabled,
        failedGate,
      });
      if (!ready || !active || attempted) return;
      attemptRef.current.keys.add(key);
      Promise.resolve(fn()).then(
        (ok) => { if (ok === false) setFailedGate(key); },
        () => setFailedGate(key)
      );
    };

    if (step === 1) {
      run("script", !!scriptData, approveOutline);
    } else if (enableBridges && step === 2) {
      run("bridges", !!scriptData && !backend?.hasBridgeFailures, approveScript);
    } else if (step === framesStep) {
      // `failedGate` is component state, so it is lost on reload. Without the
      // attempt check a resumed session whose generation already died would
      // auto-fire another one on every page load. generationAttempts is the
      // durable equivalent: the backend bumps it on every failed render.
      run("generate", !(backend?.generationAttempts > 0), async () => {
        await configureFrames();
        await startGeneration();
      });
    }
    // Primitive pref deps: toggling an unrelated preference must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading, generationError, insufficientCredits, scriptData, session.session, enableBridges, framesStep, settingsReady, autoDisabled, failedGate,
      autoApprovePrefs.script, autoApprovePrefs.bridges, autoApprovePrefs.generate]);

  const journeyTasks = buildImageTasks({
    step,
    loading,
    scriptProgress,
    enableBridges,
    framesStep,
    generatingStep,
    session: session.session,
    finalVideoUrl,
    hasBridgeFailures: session.session?.hasBridgeFailures,
    prefs: autoApprovePrefs,
  });

  // ONE continuous checklist across the script and video phases. It shows during
  // every automatic stretch and only steps aside when parked on a review the user
  // must act on - so consecutive auto phases read as one page, and in full-auto
  // it's one page the whole way through.
  const videoStarted = step >= generatingStep;
  const scriptSubSteps = isPromptOnly ? PROMPT_ONLY_SUB_STEPS : IMAGE_SCRIPT_SUB_STEPS;
  const { tasks: mergedVideoTasks, failure: videoFailure } = buildVideoTasks(
    session.session,
    scriptData,
    { started: videoStarted, musicRequested: backgroundMusic }
  );
  // Mirrors VideoGenerationStep's `fatal`. The overlay must step aside for exactly
  // the states in which that component renders its failure card, or it covers the
  // card with a spinning header and no way to retry.
  const videoFatal = !!videoFailure?.fatal || session.session?.video?.status === "FAILED";
  // Bridge scenes (transition frames) are generated AFTER the script and BEFORE
  // the video render, as a background job - so the card sits between the two.
  // Total is known up front from the outline; the live "X/Y" count comes from the
  // APPROVE_OUTLINE job's progress (bridgeProgress). It ticks complete once every
  // bridge section has a status, or once video generation has started.
  const bridgeSections = (scriptData?.sections || []).filter((s) => s.source === "bridge");
  const totalBridges = bridgeSections.length;
  const bridgesDone = totalBridges > 0 && bridgeSections.every((s) => s.bridgeStatus);
  const bridgeCardStatus = bridgesDone || videoStarted
    ? "completed"
    : bridgeProgress
      ? "processing"
      : "pending";
  const bridgePlural = totalBridges > 1 ? "s" : "";
  const bridgeDescription = bridgeCardStatus === "completed"
    ? `${totalBridges} bridge scene${bridgePlural} ready`
    : bridgeCardStatus === "processing"
      ? (bridgeProgress?.label || `Generating ${totalBridges} bridge scene${bridgePlural}`)
      : `Transition scenes between your clips`;
  const bridgeTask = enableBridges && totalBridges > 0
    ? [{
        id: "bridges",
        name: "Bridge scenes",
        description: bridgeDescription,
        icon: Images,
        status: bridgeCardStatus,
        weight: BRIDGE_PHASE_WEIGHT,
        partial: (bridgeProgress?.percentage ?? 0) / 100,
        partialStep: 1 / Math.max(totalBridges, 1),
      }]
    : [];
  const mergedTasks = [
    ...buildScriptTasks(scriptSubSteps, scriptProgress),
    ...bridgeTask,
    ...mergedVideoTasks,
  ];
  // Parked on a review the user must act on -> step aside and show it.
  // `manualGate` (not the raw pref) is what decides: a gate whose auto-approve is
  // switched off, has already failed, or was reached by stepping back is a manual
  // gate, and the overlay must never cover it.
  // A missing script does NOT mean the script phase is idle - a healthy run sits at
  // step 1 with `scriptData` null while the backend writes it. Work is in flight when
  // the client is driving (`loading`), the job slot is RUNNING, or the stage is one the
  // backend has yet to leave. When none hold, nothing will ever advance this session, so
  // the overlay MUST uncover ScriptStep's Generate/Retry button.
  const backend = session.session;
  const preScriptWorking =
    backend?.jobStatus === "RUNNING" ||
    backend?.stage === "IMAGES_UPLOADED" ||
    backend?.stage === "RESTYLING";
  // The backend hands off between jobs (analyze DONE -> outline claims the slot), and a
  // poll landing inside that gap reads as stuck. Only a state that HOLDS is a deadlock.
  const rawScriptStuck = step === 1 && !loading && !scriptData && !preScriptWorking;
  const [scriptStuckConfirmed, setScriptStuckConfirmed] = useState(false);
  useEffect(() => {
    if (!rawScriptStuck) {
      setScriptStuckConfirmed(false);
      return;
    }
    const t = setTimeout(() => setScriptStuckConfirmed(true), SCRIPT_STUCK_GRACE_MS);
    return () => clearTimeout(t);
  }, [rawScriptStuck]);
  const scriptStuckManual = rawScriptStuck && scriptStuckConfirmed;
  const atManualReview =
    (step === 1 && !loading && !!scriptData && manualGate("script")) ||
    scriptStuckManual ||
    (enableBridges && step === 2 && manualGate("bridges")) ||
    (step === framesStep && manualGate("generate"));
  const showMergedRun =
    step < completedStep &&
    (session.sessionId != null || loading) &&
    (step > 0 || loading) &&
    !atManualReview &&
    !generationError &&
    !videoFatal &&
    !insufficientCredits;

  // The bar is a weighted function of the rows above, all of which are derived
  // from durable backend state - so a reload or a resume lands on the real
  // percentage instead of restarting a mount-time ramp.
  const { target: mergedTarget, ceiling: mergedCeiling } = progressFromTasks(mergedTasks);
  const mergedProgress = useSmoothProgress({
    active: showMergedRun,
    done: !!finalVideoUrl,
    target: mergedTarget,
    ceiling: mergedCeiling,
  });

  // Render current step component
  const renderStep = () => {
    if (step === 0) {
      return (
        <PromptStep
          pipelineMode={mode}
          onModeChange={!session.sessionId ? onModeChange : undefined}
          onBackToChooser={!session.sessionId ? onBackToChooser : undefined}
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          style={style}
          setStyle={setStyle}
          targetDuration={targetDuration}
          setTargetDuration={setTargetDuration}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          images={images}
          addImages={addImages}
          removeImage={removeImage}
          reorderImages={reorderImages}
          onLabelsChange={setImageLabels}
          voiceId={voiceId}
          setVoiceId={setVoiceId}
          backgroundMusic={backgroundMusic}
          setBackgroundMusic={setBackgroundMusic}
          onStart={startSession}
          loading={loading}
          openingFrame={openingFrame}
          setOpeningFrame={setOpeningFrame}
          closingFrame={closingFrame}
          setClosingFrame={setClosingFrame}
          styleOptions={styleOptions}
          enableBridges={enableBridges}
          setEnableBridges={setEnableBridges}
          extendPhotos={extendPhotos}
          setExtendPhotos={setExtendPhotos}
        />
      );
    }

    if (step === 1) {
      return (
        <ScriptStep
          scriptData={scriptData}
          setScriptData={setScriptData}
          editRequest={editRequest}
          setEditRequest={setEditRequest}
          generateScript={generateScript}
          editScriptWithAI={editScriptWithAI}
          approveOutline={approveOutlineAndGenerate}
          session={session.session}
          loading={loading}
          images={images}
          onNext={handleNext}
          pipelineMode={mode}
          openingFrame={openingFrame}
          closingFrame={closingFrame}
          generatedFrameImages={generatedFrameImages}
          phase="outline"
          enableBridges={enableBridges}
          scriptGenFailed={scriptGenFailed}
        />
      );
    }

    // Bridges step only exists when bridges are enabled
    if (enableBridges && step === 2) {
      return (
        <ScriptStep
          scriptData={scriptData}
          setScriptData={setScriptData}
          editRequest={editRequest}
          setEditRequest={setEditRequest}
          approveScript={approveScriptAndGenerate}
          retryBridgeFrames={retryBridgeFrames}
          uploadBridgeImage={uploadBridgeImage}
          session={session.session}
          loading={loading}
          images={images}
          onNext={handleNext}
          pipelineMode={mode}
          openingFrame={openingFrame}
          closingFrame={closingFrame}
          generatedFrameImages={generatedFrameImages}
          phase="bridges"
          enableBridges={enableBridges}
        />
      );
    }

    if (step === framesStep) {
      return (
        <FramesStep
          openingFrame={openingFrame}
          closingFrame={closingFrame}
          voiceId={voiceId}
          setVoiceId={setVoiceId}
          backgroundMusic={backgroundMusic}
          setBackgroundMusic={setBackgroundMusic}
          configureFrames={configureFrames}
          startGeneration={startGeneration}
        />
      );
    }

    if (step === generatingStep) {
      return (
        <VideoGenerationStep
          session={session.session}
          failedSession={failedSession}
          scriptData={scriptData}
          openingFrame={openingFrame}
          closingFrame={closingFrame}
          generationError={generationError}
          onRegenerate={startGeneration}
        />
      );
    }

    if (step === completedStep) {
      return (
        <ResultStep
          finalVideoUrl={finalVideoUrl}
          scriptData={scriptData}
          session={session.session}
          enterEditingMode={enterEditingMode}
          reset={reset}
        />
      );
    }

    if (step === editingStep) {
      return (
        <EditingStep
          session={session.session}
          sessionId={session.sessionId}
          updateClip={updateClip}
          regenerateClip={regenerateClip}
          regenerateNarration={regenerateNarration}
          reorderClips={reorderClips}
          reassembleVideo={reassembleVideo}
          deleteClip={deleteClip}
          goToResult={() => goToStep(completedStep)}
          refreshSession={refreshSession}
          loading={loading}
        />
      );
    }

    return null;
  };

  // The journey timeline spans the content steps through generation (hidden on the
  // prompt screen and the final result/editing screens).
  const showProgressBar = (step > 0 && step <= generatingStep) || showMergedRun;

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

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
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

        {/* Progress overlay, outside the slide animation. A fully-automatic run
            shows ONE continuous checklist across script + video; otherwise the
            per-phase script loading screen. */}
        <AnimatePresence>
          {showMergedRun ? (
            <motion.div
              key="merged-run"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-40"
              style={{ background: "#F5F0EB" }}
            >
              <ProgressChecklist
                title={videoStarted ? "Creating your video" : "Writing your script"}
                headerIcon={videoStarted ? Film : Sparkles}
                progress={sessionRestoring ? null : mergedProgress}
                tasks={mergedTasks}
                sessionId={session.sessionId}
                logPhase={videoStarted ? "video" : "script"}
                onLeave={videoStarted ? () => navigate("/videos") : undefined}
              />
            </motion.div>
          ) : loading && (step === 0 || step === 1) ? (
            <ScriptLoadingScreen
              progress={scriptProgress}
              subSteps={isPromptOnly ? PROMPT_ONLY_SUB_STEPS : undefined}
            />
          ) : null}
        </AnimatePresence>
      </div>

      {/* Loading overlay: steps 0/1 handled by ScriptLoadingScreen; suppressed
          entirely during a merged full-auto run */}
      {!showMergedRun && loading && step !== generatingStep && step !== 0 && step !== 1 && (
        <MergeLoadingOverlay
          text={
            enableBridges && step === 2
              ? (bridgeProgress?.label
                  ? `Generating bridge scenes (${bridgeProgress.label})`
                  : "Generating bridge images...")
              : step === framesStep
              ? "Saving settings..."
              : "Processing..."
          }
          progress={enableBridges && step === 2 ? (bridgeProgress?.percentage ?? null) : null}
        />
      )}

      {/* Insufficient credits modal */}
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
