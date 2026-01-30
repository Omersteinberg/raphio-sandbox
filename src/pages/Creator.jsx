import { motion, AnimatePresence } from "framer-motion";
import { CircleChevronRight, CircleChevronLeft } from "lucide-react";
import MergeFloatingActionButton from "@/components/merge/MergeFloatingActionButton";
import { useCreator } from "@/hooks/creator/useCreator";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";
import ProgressBar from "@/components/creator/ProgressBar";
import ChatWithImages from "@/components/creator/ChatWithImages";
import SectionsWithVoice from "@/components/creator/SectionsWithVoice";
import PreviewStep from "@/components/creator/PreviewStep";
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
    imagePool,
    voiceSelector,
    selectedAI,
    setSelectedAI,
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

  // Component mapping - New combined step flow
  const components = [
    // Step 0: Chat + Images
    <ChatWithImages
      key="chat-images"
      messages={storylineChat.messages}
      handleSendMessage={storylineChat.handleSendMessage}
      handleCardClick={storylineChat.handleCardClick}
      loading={storylineChat.loading}
      images={imagePool.images}
      addImages={imagePool.addImages}
      removeImage={imagePool.removeImage}
      clearImages={imagePool.clearImages}
    />,
    // Step 1: Sections + Voice
    <SectionsWithVoice
      key="sections-voice"
      sections={scriptReview.sections}
      updateSection={scriptReview.updateSection}
      addSection={scriptReview.addSection}
      removeSection={scriptReview.removeSection}
      getTotalDuration={scriptReview.getTotalDuration}
      uploadedImages={imagePool.images}
      voices={voiceSelector.voices}
      filteredVoices={voiceSelector.filteredVoices}
      selectedVoice={voiceSelector.selectedVoice}
      setSelectedVoice={voiceSelector.setSelectedVoice}
      voiceFilter={voiceSelector.filter}
      setVoiceFilter={voiceSelector.setFilter}
      voiceLoading={voiceSelector.loading}
    />,
    // Step 2: Preview + AI Selection
    <PreviewStep
      key="preview"
      sections={scriptReview.sections}
      selectedVoice={voiceSelector.selectedVoice}
      voices={voiceSelector.voices}
      selectedAI={selectedAI}
      setSelectedAI={setSelectedAI}
      onGenerate={handleNext}
      loading={loading}
    />,
    // Step 3: Processing
    <ProcessingView
      key="processing"
      progress={progress}
      processingError={processingError}
      onRetry={handleNext}
      onCancel={handleCreateAnother}
    />,
    // Step 4: Result
    <ResultView
      key="result"
      videoId={videoId}
      finalVideoUrl={finalVideoUrl}
      title={scriptReview.script?.title}
      onCreateAnother={handleCreateAnother}
    />,
  ];

  // Determine if we need nav buttons and what loading text to show
  const showNavButtons = step >= STEPS.SECTIONS_VOICE && step <= STEPS.PREVIEW;
  const isContentStep = step <= STEPS.PREVIEW;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Progress Bar - show for content steps */}
      {isContentStep && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <ProgressBar currentStep={step} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
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
            <div className="w-full h-full bg-white">
              {components[step]}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        {showNavButtons && (
          <>
            <MergeFloatingActionButton
              className="absolute left-6 top-1/2 -translate-y-1/2 z-10"
              size={50}
              padding={5}
              icon={<CircleChevronLeft />}
              onClick={handlePrev}
              disabled={loading}
            />
            {step !== STEPS.PREVIEW && (
              <MergeFloatingActionButton
                className="absolute right-6 top-1/2 -translate-y-1/2 z-10"
                size={50}
                padding={5}
                icon={<CircleChevronRight />}
                onClick={handleNext}
                disabled={loading}
              />
            )}
          </>
        )}

        {/* Next button for Chat step */}
        {step === STEPS.CHAT_UPLOAD && storylineChat.messages.length > 0 && (
          <MergeFloatingActionButton
            className="absolute right-6 top-1/2 -translate-y-1/2 z-10"
            size={50}
            padding={5}
            icon={<CircleChevronRight />}
            onClick={handleNext}
            disabled={loading || imagePool.images.length === 0}
          />
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <>
          {step === STEPS.CHAT_UPLOAD ? (
            <MergeLoadingOverlay text="Generating your script..." />
          ) : step === STEPS.PREVIEW ? (
            <MergeLoadingOverlay text="Starting video generation..." />
          ) : (
            <MergeLoadingOverlay />
          )}
        </>
      )}
    </div>
  );
}
