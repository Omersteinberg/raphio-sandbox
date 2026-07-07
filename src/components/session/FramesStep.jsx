import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Voice and background music are chosen up front on the prompt step, so this
// step is just a final review + the "start generation" action.
export default function FramesStep({
  openingFrame,
  closingFrame,
  backgroundMusic,
  configureFrames,
  startGeneration,
}) {
  const handleStartGeneration = async () => {
    try {
      await configureFrames();
      await startGeneration();
    } catch (err) {
      console.error("[FramesStep] Error in handleStartGeneration:", err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-2xl px-6 py-8 space-y-4">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-xl font-semibold text-ink">Ready to Generate</h2>
          <p className="text-sm text-ink-muted">
            Confirm your settings and start video generation
          </p>
        </div>

        {/* Start Generation Button */}
        <Button
          onClick={handleStartGeneration}
          className="w-full text-white py-6 text-lg mt-6"
          style={{ background: "var(--gradient-brand)" }}
        >
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Start Video Generation
            <ArrowRight className="w-5 h-5" />
          </span>
        </Button>

        {/* Info Box */}
        <div className="p-4 bg-terra/5 rounded-lg border border-terra/30">
          <p className="text-sm text-terra">
            <strong>What happens next:</strong>
          </p>
          <ul className="text-xs text-terra mt-2 space-y-1 list-disc list-inside">
            {openingFrame?.enabled && <li>Opening frame generated</li>}
            <li>Each section converted to video clips</li>
            <li>Narration generated with AI voice</li>
            {backgroundMusic && <li>Background music generated with AI</li>}
            {closingFrame?.enabled && <li>Closing frame generated</li>}
            <li>Final video assembled automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
