import { motion, AnimatePresence } from "framer-motion";
import StorylineChat from "@/components/creator/StorylineChat";
import { CircleChevronRight, CircleChevronLeft } from "lucide-react";
import MergeFloatingActionButton from "@/components/merge/MergeFloatingActionButton";
import ImageSequencer from "@/components/creator/ImageSequencer";
import { useCreator } from "@/hooks/creator/useCreator";
import EditorView from "@/components/creator/EditorView";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import PreviewSelector from "@/components/creator/PreviewSelector";
import ScriptReview from "@/components/creator/ScriptReview";
import VoiceSelector from "@/components/creator/VoiceSelector";
import ProcessingView from "@/components/creator/ProcessingView";
import ResultView from "@/components/creator/ResultView";

export default function Creator() {
  const {
    step,
    loading,
    direction,
    handleNext,
    handlePrev,
    handleRegenerate,
    handleCreateAnother,
    storylineChat,
    scriptReview,
    imageSequencer,
    voiceSelector,
    previewSelector,
    videoId,
    progress,
    finalVideoUrl,
    processingError,
    STEPS,
  } = useCreator();

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

  // Component mapping - 6-step flow
  const components = [
    // Step 0: Chat
    <StorylineChat key="storyline" {...storylineChat} />,
    // Step 1: Script Review
    <ScriptReview
      key="script"
      {...scriptReview}
      targetDuration={60}
      onRegenerate={handleRegenerate}
    />,
    // Step 2: Image Upload
    <ImageSequencer
      key="sequencer"
      {...imageSequencer}
      sections={scriptReview.sections}
    />,
    // Step 3: Voice Selection
    <VoiceSelector key="voice" {...voiceSelector} />,
    // Step 4: Processing
    <ProcessingView
      key="processing"
      progress={progress}
      processingError={processingError}
      onRetry={handleNext}
      onCancel={handleCreateAnother}
    />,
    // Step 5: Result
    <ResultView
      key="result"
      videoId={videoId}
      finalVideoUrl={finalVideoUrl}
      title={scriptReview.script?.title}
      onCreateAnother={handleCreateAnother}
    />,
  ];

  // Steps that need scrolling (have lots of content)
  const scrollableSteps = [STEPS.SCRIPT_REVIEW, STEPS.IMAGE_UPLOAD, STEPS.VOICE_SELECT];
  const needsScroll = scrollableSteps.includes(step);

  return (
    <div className="min-h-screen bg-background-gradient flex justify-center items-center relative overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className={`absolute inset-0 flex justify-center ${
            needsScroll ? "items-start overflow-y-auto" : "items-center"
          }`}
        >
          {components[step]}
        </motion.div>
      </AnimatePresence>

      {/* Back button - show on steps 1-3 (Script, Image, Voice) */}
      {step >= STEPS.SCRIPT_REVIEW && step <= STEPS.VOICE_SELECT && (
        <MergeFloatingActionButton
          className="absolute left-20 z-10"
          size={60}
          padding={5}
          icon={<CircleChevronLeft />}
          onClick={handlePrev}
          disabled={loading}
        />
      )}

      {/* Next button - show on steps 1-3 (Script, Image, Voice) */}
      {step >= STEPS.SCRIPT_REVIEW && step <= STEPS.VOICE_SELECT && (
        <MergeFloatingActionButton
          className="absolute right-20 z-10"
          size={60}
          padding={5}
          icon={<CircleChevronRight />}
          onClick={handleNext}
          disabled={loading}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <>
          {step === STEPS.CHAT ? (
            <MergeLoadingOverlay text="Generating your script..." />
          ) : step === STEPS.SCRIPT_REVIEW ? (
            <MergeLoadingOverlay text="Saving your script..." />
          ) : step === STEPS.IMAGE_UPLOAD ? (
            <MergeLoadingOverlay text="Uploading your images..." />
          ) : step === STEPS.VOICE_SELECT ? (
            <MergeLoadingOverlay text="Starting video generation..." />
          ) : (
            <MergeLoadingOverlay />
          )}
        </>
      )}
    </div>
  );
}
