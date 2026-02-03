import { motion, AnimatePresence } from "framer-motion";
import { CircleChevronLeft } from "lucide-react";
import MergeFloatingActionButton from "@/components/merge/MergeFloatingActionButton";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import { useSession } from "@/hooks/session/useSession";

// Step components
import PromptStep from "@/components/session/PromptStep";
import ImagesStep from "@/components/session/ImagesStep";
import ScriptStep from "@/components/session/ScriptStep";
import FramesStep from "@/components/session/FramesStep";
import GeneratingStep from "@/components/session/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";

// Step names for progress bar
const STEP_NAMES = [
  "Prompt",
  "Images",
  "Analysis",
  "Script",
  "Frames",
  "Generating",
  "Complete",
];

export default function Creator() {
  const session = useSession();

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
    startSession,

    // Images step
    images,
    addImages,
    removeImage,
    uploadImages,
    analyzeImages,
    imageAnalysis,

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
    videoModel,
    setVideoModel,
    voiceId,
    setVoiceId,
    configureFrames,
    startGeneration,

    // Result step
    finalVideoUrl,
    enterEditingMode,
    reset,

    // Editing step
    updateClip,
    regenerateClip,
    regenerateNarration,
    reorderClips,
    reassembleVideo,
    deleteClip,

    // Navigation
    handleNext,
    goToStep,
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
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            style={style}
            setStyle={setStyle}
            targetDuration={targetDuration}
            setTargetDuration={setTargetDuration}
            images={images}
            addImages={addImages}
            removeImage={removeImage}
            onStart={startSession}
            loading={loading}
          />
        );

      case 1:
      case 2:
        return (
          <ImagesStep
            images={images}
            addImages={addImages}
            removeImage={removeImage}
            uploadImages={uploadImages}
            analyzeImages={analyzeImages}
            imageAnalysis={imageAnalysis}
            session={session.session}
            loading={loading}
            onNext={() => generateScript()}
          />
        );

      case 3:
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
          />
        );

      case 4:
        return (
          <FramesStep
            openingFrame={openingFrame}
            setOpeningFrame={setOpeningFrame}
            closingFrame={closingFrame}
            setClosingFrame={setClosingFrame}
            videoModel={videoModel}
            setVideoModel={setVideoModel}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
            configureFrames={configureFrames}
            startGeneration={startGeneration}
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
            updateClip={updateClip}
            regenerateClip={regenerateClip}
            regenerateNarration={regenerateNarration}
            reorderClips={reorderClips}
            reassembleVideo={reassembleVideo}
            deleteClip={deleteClip}
            goToResult={() => goToStep(6)}
            loading={loading}
          />
        );

      default:
        return null;
    }
  };

  // Show progress bar for content steps
  const showProgressBar = step > 0 && step < 6;
  const showBackButton = step > 0 && step < 5;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {STEP_NAMES.slice(0, 5).map((name, index) => (
                <div
                  key={name}
                  className={`flex items-center ${
                    index < STEP_NAMES.length - 1 ? "flex-1" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > index
                        ? "bg-purple-600 text-white"
                        : step === index
                        ? "bg-purple-100 text-purple-600 border-2 border-purple-600"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < STEP_NAMES.length - 2 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step > index ? "bg-purple-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              {STEP_NAMES.slice(0, 5).map((name, index) => (
                <span
                  key={name}
                  className={step === index ? "text-purple-600 font-medium" : ""}
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

        {/* Back Button */}
        {showBackButton && (
          <MergeFloatingActionButton
            className="absolute left-6 top-1/2 -translate-y-1/2 z-10"
            size={50}
            padding={5}
            icon={<CircleChevronLeft />}
            onClick={handlePrev}
            disabled={loading}
          />
        )}
      </div>

      {/* Loading overlay */}
      {loading && step !== 5 && (
        <MergeLoadingOverlay
          text={
            step === 0
              ? "Creating session..."
              : step === 1
              ? "Uploading images..."
              : step === 2
              ? "Analyzing images..."
              : step === 3
              ? "Generating script..."
              : "Processing..."
          }
        />
      )}
    </div>
  );
}
