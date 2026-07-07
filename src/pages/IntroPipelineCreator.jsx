import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";
import IntroBriefStep from "@/components/session/IntroBriefStep";
import IntroScriptStep from "@/components/session/IntroScriptStep";
import GeneratingStep from "@/components/session/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";
import { useIntroSession } from "@/hooks/session/useIntroSession";
import JourneyTimeline from "@/components/session/JourneyTimeline";
import { buildIntroTasks } from "@/lib/journeyTasks";
import { getAutoApprove } from "@/lib/preferences";

const GENERATING_STEP = 2;
const COMPLETED_STEP = 3;

export default function IntroPipelineCreator({ onModeChange }) {
  const intro = useIntroSession();
  const { step, direction, loading } = intro;

  // Auto-approve (skip steps) — Intro fuses approve+generate, so it only respects
  // the "Generate" preference. Only fires on forward progress, never on resume.
  const [autoApprovePrefs] = useState(getAutoApprove);
  const prevStepRef = useRef(null);
  const enteredForwardRef = useRef(false);
  const autoFiredRef = useRef(new Set());

  useEffect(() => {
    const prev = prevStepRef.current;
    if (prev !== step) {
      enteredForwardRef.current = prev !== null && step === prev + 1;
      prevStepRef.current = step;
    }
    if (!enteredForwardRef.current) return;
    if (loading || intro.error || intro.insufficientCredits) return;
    if (autoFiredRef.current.has(step)) return;

    if (step === 1 && autoApprovePrefs.generate && intro.introScript) {
      autoFiredRef.current.add(step);
      intro.approveAndGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading, intro.error, intro.insufficientCredits, intro.introScript]);

  const journeyTasks = buildIntroTasks({
    step,
    loading,
    scriptProgress: intro.scriptProgress,
    generatingStep: GENERATING_STEP,
    session: intro.session,
    finalVideoUrl: intro.finalVideoUrl,
    prefs: autoApprovePrefs,
  });

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (d) => ({ zIndex: 0, x: d < 0 ? 1000 : -1000, opacity: 0 }),
  };
  const transition = { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } };

  const renderStep = () => {
    if (step === 0) {
      return (
        <IntroBriefStep
          {...intro}
          onContinue={intro.startIntroSession}
          onModeChange={!intro.sessionId ? onModeChange : undefined}
        />
      );
    }
    if (step === 1) {
      return (
        <IntroScriptStep
          introScript={intro.introScript}
          updateScriptField={intro.updateScriptField}
          voiceId={intro.voiceId}
          setVoiceId={intro.setVoiceId}
          editRequest={intro.editRequest}
          setEditRequest={intro.setEditRequest}
          editScriptWithAI={intro.editScriptWithAI}
          regenerateScript={intro.regenerateScript}
          approveAndGenerate={intro.approveAndGenerate}
          loading={loading}
        />
      );
    }
    if (step === GENERATING_STEP) {
      return (
        <GeneratingStep
          session={intro.session}
          scriptData={null}
          openingFrame={null}
          closingFrame={null}
          generationError={intro.error}
          onRegenerate={intro.approveAndGenerate}
        />
      );
    }
    if (step === COMPLETED_STEP) {
      return (
        <ResultStep
          finalVideoUrl={intro.finalVideoUrl || intro.session?.video?.finalVideoUrl || null}
          scriptData={null}
          session={intro.session}
          enterEditingMode={() => {}}
          reset={intro.reset}
        />
      );
    }
    return null;
  };

  const showProgressBar = step > 0 && step <= GENERATING_STEP;

  return (
    <div className="h-full flex flex-col font-figtree" style={{ background: "linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)" }}>
      {showProgressBar && (
        <JourneyTimeline
          tasks={journeyTasks}
          onStepClick={(t) => { if (t.navStep != null) intro.goToStep(t.navStep); }}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={transition} className="absolute inset-0 flex">
            <div className="w-full h-full">{renderStep()}</div>
          </motion.div>
        </AnimatePresence>

        {/* Image-pipeline loading: script generation/regeneration */}
        <AnimatePresence>
          {loading && (step === 0 || step === 1) && (
            <ScriptLoadingScreen progress={intro.scriptProgress} />
          )}
        </AnimatePresence>
      </div>

      {intro.insufficientCredits && (
        <InsufficientCreditsModal
          required={intro.insufficientCredits.required}
          available={intro.insufficientCredits.available}
          onClose={intro.dismissInsufficientCredits}
        />
      )}
    </div>
  );
}
