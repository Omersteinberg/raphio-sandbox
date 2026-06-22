import { motion, AnimatePresence } from "framer-motion";
import ScriptLoadingScreen from "@/components/session/ScriptLoadingScreen";
import IntroBriefStep from "@/components/session/IntroBriefStep";
import IntroScriptStep from "@/components/session/IntroScriptStep";
import GeneratingStep from "@/components/session/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";
import { useIntroSession } from "@/hooks/session/useIntroSession";

const STEP_NAMES = ["Brief", "Script", "Generate"];
const GENERATING_STEP = 2;
const COMPLETED_STEP = 3;

export default function IntroPipelineCreator({ onModeChange }) {
  const intro = useIntroSession();
  const { step, direction, loading } = intro;

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

  const showProgressBar = step > 0 && step < GENERATING_STEP;

  return (
    <div className="h-full flex flex-col font-figtree" style={{ background: "linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)" }}>
      {showProgressBar && (
        <div className="px-6 py-3 border-b" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(45,34,53,0.08)" }}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {STEP_NAMES.map((name, index) => (
                <div key={name} className={`flex items-center ${index < STEP_NAMES.length - 1 ? "flex-1" : ""}`}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                    style={
                      step > index
                        ? { background: "linear-gradient(135deg, #C1440E, #E8603C)", color: "#fff" }
                        : step === index
                        ? { background: "#FFF0E6", color: "#C1440E", border: "2px solid #C1440E" }
                        : { background: "#F0EAE5", color: "#7A6A62" }
                    }
                  >
                    {index + 1}
                  </div>
                  {index < STEP_NAMES.length - 1 && (
                    <div className="flex-1 h-1 mx-2 rounded-full" style={{ background: step > index ? "linear-gradient(135deg, #C1440E, #E8603C)" : "#F0EAE5" }} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs">
              {STEP_NAMES.map((name, index) => (
                <span key={name} className="font-medium" style={{ color: step === index ? "#C1440E" : "#7A6A62" }}>{name}</span>
              ))}
            </div>
          </div>
        </div>
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
