import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import { useSession } from "@/hooks/session/useSession";
import { useAuth } from "@/hooks/useAuth.jsx";

// Step components
import PromptStep from "@/components/session/PromptStep";
import ScriptStep from "@/components/session/ScriptStep";
import FramesStep from "@/components/session/FramesStep";
import GeneratingStep from "@/components/session/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";

// Step names for progress bar
const STEP_NAMES = [
  "Prompt",
  "Script",
  "Generate",
  "Processing",
  "Complete",
];

export default function ImagePipelineCreator({ onModeChange }) {
  const { credits } = useAuth();
  const navigate = useNavigate();
  const session = useSession();

  // Redirect to buy credits if user has 0 credits
  useEffect(() => {
    if (credits !== null && credits < 1) {
      navigate('/buy-credits');
    }
  }, [credits, navigate]);

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
    startSession,
    styleOptions,

    // Images (from prompt)
    images,
    addImages,
    removeImage,
    reorderImages,

    // Script step
    scriptData,
    setScriptData,
    editRequest,
    setEditRequest,
    generateScript,
    editScriptWithAI,
    approveScript,

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

    // Result step
    finalVideoUrl,
    enterEditingMode,
    reset,
    scriptProgress,

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

  // Render current step component
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <PromptStep
            pipelineMode="image"
            onModeChange={!session.sessionId ? onModeChange : undefined}
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            style={style}
            setStyle={setStyle}
            images={images}
            addImages={addImages}
            removeImage={removeImage}
            reorderImages={reorderImages}
            onStart={startSession}
            loading={loading}
            openingFrame={openingFrame}
            setOpeningFrame={setOpeningFrame}
            closingFrame={closingFrame}
            setClosingFrame={setClosingFrame}
            styleOptions={styleOptions}
          />
        );

      case 1:
        return (
          <ScriptStep
            scriptData={scriptData}
            setScriptData={setScriptData}
            editRequest={editRequest}
            setEditRequest={setEditRequest}
            generateScript={generateScript}
            editScriptWithAI={editScriptWithAI}
            approveScript={approveScript}
            session={session.session}
            loading={loading}
            images={images}
            onNext={handleNext}
            openingFrame={openingFrame}
            closingFrame={closingFrame}
            generatedFrameImages={generatedFrameImages}
          />
        );

      case 2:
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

      case 3:
        return (
          <GeneratingStep
            session={session.session}
            scriptData={scriptData}
            openingFrame={openingFrame}
            closingFrame={closingFrame}
          />
        );

      case 4:
        return (
          <ResultStep
            finalVideoUrl={finalVideoUrl}
            scriptData={scriptData}
            session={session.session}
            enterEditingMode={enterEditingMode}
            reset={reset}
          />
        );

      case 5:
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
            goToResult={() => goToStep(4)}
            refreshSession={refreshSession}
            loading={loading}
          />
        );

      default:
        return null;
    }
  };

  // Show progress bar for content steps
  const showProgressBar = step > 0 && step < 3;
  const progressSteps = STEP_NAMES.slice(0, 3);

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
                      step > index
                        ? { background: "linear-gradient(135deg, #F97066, #FB923C)", color: "#fff" }
                        : step === index
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
                        background: step > index
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
                  style={{ color: step === index ? "#F97066" : "#9B8FA8" }}
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
            <div className="w-full h-full">{renderStep()}</div>
          </motion.div>
        </AnimatePresence>


      </div>

      {/* Loading overlay */}
      {loading && step !== 3 && (
        <MergeLoadingOverlay
          text={
            step === 0
              ? "Creating session..."
              : step === 1
              ? "Generating script..."
              : step === 2
              ? "Saving generation settings..."
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
