import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Sparkles, Images } from "lucide-react";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import { useSession } from "@/hooks/session/useSession";
import { loadPending } from "@/lib/pendingSession";
import JourneyTimeline from "@/components/session/JourneyTimeline";
import ProgressChecklist from "@/components/session/ProgressChecklist";
import { buildImageTasks } from "@/lib/journeyTasks";
import { buildScriptTasks, buildVideoTasks } from "@/lib/progressTasks";
import { useAuth } from "@/hooks/useAuth";
import { loadSavedFrames, hydrateFrameConfig } from "@/lib/savedFrames";

// Step components
import PromptStep from "@/components/session/PromptStep";
import ScriptStep from "@/components/session/ScriptStep";
import FramesStep from "@/components/session/FramesStep";
import VideoGenerationStep from "@/components/session/VideoGenerationStep";
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

  // Auto-approve (skip steps) preferences — loaded from the user's account (Settings page).
  const { autoApprove: autoApprovePrefs } = useAuth();
  const prevStepRef = useRef(null);
  const enteredForwardRef = useRef(false);
  const autoFiredRef = useRef(new Set());

  // Auto-advance past review gates the user chose to skip. Only fires on a gate
  // reached by normal forward progress (+1), never a resume jump (0 -> middle) or
  // a step-back, so resuming a session never silently approves or spends credits.
  useEffect(() => {
    const prev = prevStepRef.current;
    if (prev !== step) {
      enteredForwardRef.current = prev !== null && step === prev + 1;
      prevStepRef.current = step;
    }
    if (!enteredForwardRef.current) return;
    if (loading || generationError || insufficientCredits) return;
    if (autoFiredRef.current.has(step)) return;

    const backend = session.session;
    let fire = null;
    if (step === 1 && autoApprovePrefs.script && scriptData) {
      fire = () => approveOutline();
    } else if (
      enableBridges && step === 2 && autoApprovePrefs.bridges &&
      scriptData && !backend?.hasBridgeFailures
    ) {
      fire = () => approveScript();
    } else if (step === framesStep && autoApprovePrefs.generate) {
      fire = async () => { await configureFrames(); await startGeneration(); };
    }
    if (!fire) return;
    autoFiredRef.current.add(step);
    fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading, generationError, insufficientCredits, scriptData, session.session, enableBridges, framesStep]);

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
  // must act on — so consecutive auto phases read as one page, and in full-auto
  // it's one page the whole way through.
  const videoStarted = step >= generatingStep;
  const scriptSubSteps = isPromptOnly ? PROMPT_ONLY_SUB_STEPS : IMAGE_SCRIPT_SUB_STEPS;
  const { tasks: mergedVideoTasks, realProgress: mergedVideoProgress } = buildVideoTasks(
    session.session,
    scriptData,
    { started: videoStarted, musicRequested: backgroundMusic }
  );
  // Bridge scenes (transition frames) are generated AFTER the script and BEFORE
  // the video render, as a background job — so the card sits between the two.
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
      }]
    : [];
  const mergedTasks = [
    ...buildScriptTasks(scriptSubSteps, scriptProgress),
    ...bridgeTask,
    ...mergedVideoTasks,
  ];
  const mergedProgress = videoStarted ? 40 + mergedVideoProgress * 0.6 : scriptProgress * 0.4;
  // Parked on a review the user must act on -> step aside and show it.
  const atManualReview =
    (step === 1 && !loading && !!scriptData && !autoApprovePrefs.script) ||
    (enableBridges && step === 2 && !autoApprovePrefs.bridges) ||
    (step === framesStep && !autoApprovePrefs.generate);
  const showMergedRun =
    step < completedStep &&
    (session.sessionId != null || loading) &&
    (step > 0 || loading) &&
    !atManualReview &&
    !generationError &&
    !insufficientCredits;

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
                progress={mergedProgress}
                tasks={mergedTasks}
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
