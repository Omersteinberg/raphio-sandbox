import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";
import { useReferencesSession } from "@/hooks/session/useReferencesSession";
import { loadPending } from "@/lib/pendingSession";

// Step components
import PromptStep from "@/components/session/PromptStep";
import ReferenceLockStep from "@/components/session/ReferenceLockStep";
import ScriptStep from "@/components/session/ScriptStep";
import FrameGenerationStep from "@/components/session/FrameGenerationStep";
import VoiceConfigStep from "@/components/session/VoiceConfigStep";
import GeneratingStep from "@/components/session/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";

const STEP_NAMES = [
  "Prompt",
  "References",
  "Script",
  "Frames",
  "Voice",
  "Processing",
  "Complete",
];

export default function ReferencesPipelineCreator({ onModeChange }) {
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
    generateFrames,
    regenerateFrame,
    approveFrames,
    deleteScene,

    // Voice step
    voiceId,
    setVoiceId,
    backgroundMusic,
    setBackgroundMusic,
    startGeneration,

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadPending("references");
        if (cancelled || !saved) return;
        if (saved.userPrompt) setUserPrompt(saved.userPrompt);
        if (saved.style) setStyle(saved.style);
        if (saved.references) {
          const refs = Array.isArray(saved.references)
            ? saved.references
            : [
                ...(saved.references.characters || []).map(r => ({ ...r, type: r.type || 'character' })),
                ...(saved.references.settings || []).map(r => ({ ...r, type: r.type || 'setting' })),
              ];
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
            references={references}
            onReferencesChange={setReferences}
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            style={style}
            setStyle={setStyle}
            targetDuration={targetDuration}
            setTargetDuration={setTargetDuration}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
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
            onRegenerate={regenerateFrame}
            onApprove={approveFrames}
            onDelete={deleteScene}
            onGenerateFrames={generateFrames}
            error={error}
          />
        );

      case 4:
        return (
          <VoiceConfigStep
            voiceId={voiceId}
            setVoiceId={setVoiceId}
            backgroundMusic={backgroundMusic}
            setBackgroundMusic={setBackgroundMusic}
            sceneFrames={sceneFrames}
            onStartGeneration={startGeneration}
            loading={loading}
            insufficientCredits={insufficientCredits}
          />
        );

      case 5:
        return (
          <GeneratingStep
            session={session.session}
            scriptData={scriptData}
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

  const showProgressBar = step >= 1 && step <= 4;
  const progressSteps = STEP_NAMES.slice(1, 5);
  const progressIndex = step - 1;

  const REFERENCES_SUB_STEPS = [
    { id: "session",    label: "Setting up your session",    range: [0, 15]  },
    { id: "references", label: "Locking in your references", range: [15, 40] },
    { id: "characters", label: "Building your characters",   range: [40, 65] },
    { id: "scenes",     label: "Designing your scenes",       range: [65, 85] },
    { id: "script",     label: "Generating script",          range: [85, 100] },
  ];

  return (
    <div
      className="h-full flex flex-col font-figtree"
      style={{ background: "linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)" }}
    >
      {showProgressBar && (
        <div
          className="px-6 py-3 border-b"
          style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(45,34,53,0.08)" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {progressSteps.map((name, index) => (
                <div
                  key={name}
                  className={`flex items-center ${index < progressSteps.length - 1 ? "flex-1" : ""}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                    style={
                      progressIndex > index
                        ? { background: "linear-gradient(135deg, #F97066, #FB923C)", color: "#fff" }
                        : progressIndex === index
                        ? { background: "#FFF0E6", color: "#F97066", border: "2px solid #F97066" }
                        : { background: "#F0EAFF", color: "#9B8FA8" }
                    }
                  >
                    {index + 1}
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div
                      className="flex-1 h-1 mx-2 rounded-full"
                      style={{
                        background: progressIndex > index
                          ? "linear-gradient(135deg, #F97066, #FB923C)"
                          : "#F0EAFF",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs">
              {progressSteps.map((name, index) => (
                <span
                  key={name}
                  className="font-medium"
                  style={{ color: progressIndex === index ? "#F97066" : "#9B8FA8" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
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
      </div>

      {loading && step !== 5 && step === 0 && (
        <ScriptLoadingScreen
          progress={scriptProgress}
          subSteps={REFERENCES_SUB_STEPS}
        />
      )}
      {loading && step !== 5 && step !== 0 && (
        <MergeLoadingOverlay
          text={
            step === 1 ? "Processing references..."
            : step === 2 ? "Generating script..."
            : step === 3 ? "Generating frames..."
            : "Processing..."
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
