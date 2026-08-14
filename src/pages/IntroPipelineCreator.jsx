import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";
import IntroBriefStep from "@/components/session/IntroBriefStep";
import IntroSceneReviewStep from "@/components/session/IntroSceneReviewStep";
import VideoGenerationStep from "@/components/session/VideoGenerationStep";
import ResultStep from "@/components/session/ResultStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";
import ProviderUnavailableScreen from "@/components/session/ProviderUnavailableScreen";
import { useIntroSession } from "@/hooks/session/useIntroSession";
import JourneyTimeline from "@/components/session/JourneyTimeline";
import { buildIntroTasks } from "@/lib/journeyTasks";
import { useResolvedAutoApprove } from "@/hooks/useResolvedAutoApprove";

const GENERATING_STEP = 2;
const COMPLETED_STEP = 3;

// What the intro pipeline actually does, in the order it does it.
//
// ScriptLoadingScreen's own defaults describe the photo pipeline (uploading,
// analyzing and restyling images), none of which happens here, so an intro was
// claiming work it never did. The ranges are the percentages this pipeline really
// reports: useIntroSession ticks up to 20 by hand while the session is being set
// up, then hands the bar to the backend job, whose 0-100 is mapped onto 20-100.
// The backend's own milestones inside that are 5 for the plan, 15 for the stills,
// then the clip pass, which is 78% of what is left.
const INTRO_SUB_STEPS = [
  { id: "session", label: "Setting up your session",       range: [0, 12]  },
  { id: "upload",  label: "Uploading your logo and photos", range: [12, 20] },
  { id: "design",  label: "Designing your scenes",          range: [20, 32] },
  { id: "still",   label: "Drawing the first look",         range: [32, 42] },
  { id: "voice",   label: "Recording the voiceover",        range: [42, 48] },
  { id: "render",  label: "Rendering your scenes",          range: [48, 100] },
];

export default function IntroPipelineCreator({ onModeChange }) {
  const intro = useIntroSession();
  const { step, direction, loading } = intro;

  // Auto-approve (skip steps) - Intro fuses approve+generate, so it only respects
  // the "Generate" preference. Loaded from the user's account. Only fires on
  // forward progress, never on resume.
  const { prefs: autoApprovePrefs, ready: settingsReady } = useResolvedAutoApprove(intro.session);
  const maxStepRef = useRef(0);
  const attemptRef = useRef({ step: -1, keys: new Set() });
  const [autoDisabled, setAutoDisabled] = useState(false);

  // Fires on forward progress AND on a resumed session; never on a step-back.
  // `settingsReady` gates it because `autoApprove` defaults to all-false and only
  // resolves two network hops after mount.
  useEffect(() => {
    if (step === 0) {
      maxStepRef.current = 0;
      if (autoDisabled) setAutoDisabled(false);
      return;
    }
    if (step < maxStepRef.current) {
      if (!autoDisabled) setAutoDisabled(true);
      return;
    }
    maxStepRef.current = step;
    if (attemptRef.current.step !== step) attemptRef.current = { step, keys: new Set() };

    if (!settingsReady || autoDisabled) return;
    // reworkingIndexes is checked separately from `loading`, which a rework
    // deliberately does not set. clipsReady stays true through a rework (the revised
    // scene keeps its old clipUrl in local state until the job returns), so without
    // this a user with auto-approve on would have the video generated out from under
    // an in-flight rework.
    if (loading || intro.reworkingIndexes?.length || intro.error || intro.insufficientCredits) return;

    // One stage again: the scenes arrive already rendered, so there is nothing to
    // generate before approving. Gated on every clip existing, because approve is
    // rejected by the backend until they do.
    const clipsReady = intro.introScript?.scenes?.length
      && intro.introScript.scenes.every((s) => s?.clipUrl);
    if (step === 1 && clipsReady && autoApprovePrefs.generate && !attemptRef.current.keys.has("generate")) {
      attemptRef.current.keys.add("generate");
      intro.approveAndGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading, intro.reworkingIndexes, intro.error, intro.insufficientCredits, intro.introScript, settingsReady, autoDisabled, autoApprovePrefs.generate]);

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
        <IntroSceneReviewStep
          introScript={intro.introScript}
          updateScriptField={intro.updateScriptField}
          saveScriptEdits={intro.saveScriptEdits}
          voiceId={intro.voiceId}
          setVoiceId={intro.setVoiceId}
          reviseScenes={intro.reviseScenes}
          approveAndGenerate={intro.approveAndGenerate}
          loading={loading}
          reworkingIndexes={intro.reworkingIndexes}
          reworkLabel={intro.reworkLabel}
        />
      );
    }
    if (step === GENERATING_STEP) {
      return (
        <VideoGenerationStep
          session={intro.session}
          failedSession={intro.failedSession}
          scriptData={null}
          openingFrame={null}
          closingFrame={null}
          generationError={intro.generationError}
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

        {/* Planning and rendering the scenes, and approving them into a video. Both
            are whole-pipeline waits with nothing else to look at. A rework is not
            here on purpose: it is scoped to the cards it changes, so it spins on
            those and leaves the rest of the step usable. */}
        <AnimatePresence>
          {loading && (step === 0 || step === 1) && (
            <ScriptLoadingScreen
              progress={intro.scriptProgress}
              subSteps={INTRO_SUB_STEPS}
              title={intro.scriptLabel || "Building your scenes"}
              estimate="~4 minutes"
            />
          )}
        </AnimatePresence>

        {intro.providerUnavailable && (
          <ProviderUnavailableScreen
            message={intro.providerUnavailable.message}
            loading={loading}
            onRetry={intro.startIntroSession}
            onDismiss={intro.dismissProviderUnavailable}
          />
        )}
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
