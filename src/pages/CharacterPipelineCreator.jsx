import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import { useCharacterSession } from "@/hooks/session/useCharacterSession";
import { useAuth } from "@/hooks/useAuth.jsx";

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
  const { credits } = useAuth();
  const navigate = useNavigate();
  const session = useCharacterSession();

  useEffect(() => {
    if (credits !== null && credits < 1) {
      navigate("/buy-credits");
    }
  }, [credits, navigate]);

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
    <div className="h-full bg-background flex flex-col">
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-3">
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      progressIndex > index
                        ? "bg-primary text-white"
                        : progressIndex === index
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        progressIndex > index ? "bg-primary" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              {progressSteps.map((name, index) => (
                <span
                  key={name}
                  className={progressIndex === index ? "text-primary font-medium" : ""}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
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
            <div className="w-full h-full bg-white">{renderStep()}</div>
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
