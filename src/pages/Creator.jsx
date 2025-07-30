import { motion, AnimatePresence } from "framer-motion";
import StorylineChat from "@/components/creator/StorylineChat";
import { CircleChevronRight, CircleChevronLeft } from "lucide-react";
import MergeFloatingActionButton from "@/components/merge/MergeFloatingActionButton";
import ImageSequencer from "@/components/creator/ImageSequencer";
import { useCreator } from "@/hooks/creator/useCreator";
import EditorView from "@/components/creator/EditorView";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";

export default function Creator() {
  const {
    step,
    loading,
    direction,
    handleNext,
    handlePrev,
    storylineChat,
    imageSequencer,
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

  // Component mapping
  const components = [
    <StorylineChat key="storyline" {...storylineChat} />,
    <ImageSequencer key="sequencer" {...imageSequencer} />,
    <EditorView key="preview" {...imageSequencer} />,
  ];

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
          className="absolute inset-0 flex justify-center items-center"
        >
          {components[step]}
        </motion.div>
      </AnimatePresence>

      {step > 0 && step < components.length - 1 && (
        <MergeFloatingActionButton
          className="absolute left-20 z-10"
          size={60}
          padding={5}
          icon={<CircleChevronLeft />}
          onClick={handlePrev}
          disabled={loading}
        />
      )}

      {step < components.length - 1 && (
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
          {step === 0 ? (
            <MergeLoadingOverlay text="Please wait while we save your transcript..." />
          ) : step === 1 ? (
            <MergeLoadingOverlay text="Please wait while we upload your images, this may take a few minutes..." />
          ) : (
            <MergeLoadingOverlay/>
          )}
        </>
      )}
    </div>
  );
}
