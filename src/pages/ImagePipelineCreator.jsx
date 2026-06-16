import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import { useSession } from "@/hooks/session/useSession";
import { loadPending } from "@/lib/pendingSession";

// Step components
import PromptStep from "@/components/session/PromptStep";
import ScriptStep from "@/components/session/ScriptStep";
import FramesStep from "@/components/session/FramesStep";
import GeneratingStep from "@/components/session/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";

// Step names for progress bar — dynamic based on whether bridges are enabled
const STEP_NAMES_WITH_BRIDGES = ["Prompt", "Script", "Bridges", "Generate", "Processing", "Complete"];
const STEP_NAMES_NO_BRIDGES = ["Prompt", "Script", "Generate", "Processing", "Complete"];

export default function ImagePipelineCreator({ onModeChange }) {
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
    styleOptions,
    enableBridges,
    setEnableBridges,

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
    approveOutline,
    retryBridgeFrames,
    uploadBridgeImage,

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

  // Render current step component
  const renderStep = () => {
    if (step === 0) {
      return (
        <PromptStep
          pipelineMode="image"
          onModeChange={!session.sessionId ? onModeChange : undefined}
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          style={style}
          setStyle={setStyle}
          targetDuration={targetDuration}
          setTargetDuration={setTargetDuration}
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
          approveOutline={approveOutline}
          session={session.session}
          loading={loading}
          images={images}
          onNext={handleNext}
          openingFrame={openingFrame}
          closingFrame={closingFrame}
          generatedFrameImages={generatedFrameImages}
          phase="outline"
          enableBridges={enableBridges}
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
          approveScript={approveScript}
          retryBridgeFrames={retryBridgeFrames}
          uploadBridgeImage={uploadBridgeImage}
          session={session.session}
          loading={loading}
          images={images}
          onNext={handleNext}
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
        <GeneratingStep
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

  // Show progress bar for content steps (before generating)
  const stepNames = enableBridges ? STEP_NAMES_WITH_BRIDGES : STEP_NAMES_NO_BRIDGES;
  const showProgressBar = step > 0 && step < generatingStep;
  const progressSteps = stepNames.slice(0, enableBridges ? 4 : 3);

  return (
    <div
      className="h-full flex flex-col font-figtree"
      style={{ background: "linear-gradient(180deg, #FFF8F5 0%, #FFFFFF 60%, #F8F7FF 100%)" }}
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

        {/* ScriptLoadingScreen lives here — outside the slide animation */}
        <AnimatePresence>
          {loading && (step === 0 || step === 1) && (
            <ScriptLoadingScreen progress={scriptProgress} />
          )}
        </AnimatePresence>
      </div>

      {/* Loading overlay — steps 0/1 handled by ScriptLoadingScreen */}
      {loading && step !== generatingStep && step !== 0 && step !== 1 && (
        <MergeLoadingOverlay
          text={
            enableBridges && step === 2
              ? "Generating bridge images..."
              : step === framesStep
              ? "Saving settings..."
              : "Processing..."
          }
          progress={null}
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
