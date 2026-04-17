import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import { useCharacterSession } from "@/hooks/session/useCharacterSession";
import { loadPending } from "@/lib/pendingSession";

// Step components
import PromptStep from "@/components/session/PromptStep";
import CharacterLockStep from "@/components/session/CharacterLockStep";
import ScriptStep from "@/components/session/ScriptStep";
import FrameGenerationStep from "@/components/session/FrameGenerationStep";
import VoiceConfigStep from "@/components/session/VoiceConfigStep";
import GeneratingStep from "@/components/session/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";

// Step names for progress bar
const STEP_NAMES = [
  "Prompt",
  "Character",
  "Script",
  "Frames",
  "Voice",
  "Processing",
  "Complete",
];

export default function CharacterPipelineCreator({ onModeChange }) {
  const session = useCharacterSession();

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
    startCharacterSession,

    // Character state
    character,
    setCharacter,
    lockedImage,
    lockLoading,
    lockRegenerateCount,
    approveLock,
    regenerateLock,

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

  // Rehydrate pending inputs after a credit-driven redirect
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadPending("character");
        if (cancelled || !saved) return;
        if (saved.userPrompt) setUserPrompt(saved.userPrompt);
        if (saved.style) setStyle(saved.style);
        if (saved.character) {
          // Handle both raw File and base64 reference-file formats
          let referenceFile = null;
          if (saved.character.referenceFile instanceof File) {
            referenceFile = saved.character.referenceFile;
          } else if (saved.character.referenceFile && saved.character.referenceFile.dataUrl) {
            const response = await fetch(saved.character.referenceFile.dataUrl);
            const blob = await response.blob();
            referenceFile = new File(
              [blob],
              saved.character.referenceFile.name || "reference.png",
              { type: blob.type }
            );
          }

          setCharacter((prev) => ({
            ...prev,
            name: saved.character.name ?? prev.name,
            description: saved.character.description ?? prev.description,
            useUpload: saved.character.useUpload ?? prev.useUpload,
            referenceFile: referenceFile ?? prev.referenceFile,
          }));
        }
      } catch (err) {
        console.warn("[CharacterPipelineCreator] rehydrate failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir < 0 ? 1000 : -1000,
      opacity: 0,
    }),
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
            pipelineMode="character"
            onModeChange={!sessionId ? onModeChange : undefined}
            character={character}
            onCharacterChange={setCharacter}
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            style={style}
            setStyle={setStyle}
            onStart={startCharacterSession}
            loading={loading}
            error={error}
          />
        );

      case 1:
        return (
          <CharacterLockStep
            character={character}
            lockedImage={lockedImage}
            lockLoading={lockLoading}
            lockRegenerateCount={lockRegenerateCount}
            onApprove={approveLock}
            onRegenerate={regenerateLock}
          />
        );

      case 2:
        return (
          <ScriptStep
            pipelineMode="character"
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

  // Show progress bar for content steps (1-4)
  const showProgressBar = step >= 1 && step <= 4;
  const progressSteps = STEP_NAMES.slice(1, 5); // Character, Script, Frames, Voice
  const progressIndex = step - 1; // map step 1-4 to 0-3

  return (
    <div
      className="h-full flex flex-col font-figtree"
      style={{ background: "linear-gradient(165deg, #FFF7F0 0%, #FFF0E6 30%, #F0EAFF 70%, #F9FAFB 100%)" }}
    >
      {/* Progress Bar */}
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
                  className={`flex items-center ${
                    index < progressSteps.length - 1 ? "flex-1" : ""
                  }`}
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

      {/* Main Content */}
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

      {/* Loading overlay */}
      {loading && step !== 5 && (
        <MergeLoadingOverlay
          text={
            step === 0
              ? "Creating session..."
              : step === 1
              ? "Generating character..."
              : step === 2
              ? "Generating script..."
              : step === 3
              ? "Generating frames..."
              : "Processing..."
          }
          progress={step === 0 ? scriptProgress : null}
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
