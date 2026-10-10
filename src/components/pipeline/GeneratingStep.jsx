import { AlertTriangle, Clapperboard, Film, Image, Layers, Mic, PenLine, RefreshCw, RotateCcw, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProgressChecklist from "@/components/session/ProgressChecklist";
import useSmoothProgress from "@/hooks/useSmoothProgress";

const LABELS = {
  uploads: "Uploading your photos",
  script: "Writing your script",
  narration: "Recording the voiceover",
  shots: "Planning the shots",
  anchors: "Drawing the cast and setting",
  stills: "Drawing the storyboard",
  clips: "Filming the clips",
  music: "Scoring the music",
  assemble: "Putting it together",
};

const ICONS = {
  uploads: Upload,
  script: PenLine,
  narration: Mic,
  shots: Clapperboard,
  anchors: Users,
  stills: Image,
  clips: Film,
  assemble: Layers,
};

const TITLES = {
  SCRIPTING: "Writing your script",
  FRAMING: "Drawing your storyboard",
  GENERATING: "Making your video",
};

const PHASES = {
  SCRIPTING: ["uploads", "script", "narration", "shots"],
  FRAMING: ["anchors", "stills"],
  GENERATING: ["clips", "assemble"],
};

const STAGE_START = { uploads: 2, script: 5, narration: 14, shots: 22, anchors: 30, stills: 40, clips: 62, music: 62, assemble: 92 };

// The first stage start above the current progress, or 100.
function nextStageStart(progress) {
  const starts = Object.values(STAGE_START).filter((v) => v > progress);
  return starts.length ? Math.min(...starts) : 100;
}

const COUNTED = {
  clips: (d) => `Filming the clips: ${d.done} of ${d.total} done`,
  stills: (d) => `Drawing the storyboard: ${d.done} of ${d.total} frames`,
};

// One checklist row per stage of the phase, done up to the running one. The uploads row only shows when photos were sent.
function buildTasks(status, stage, detail, hasPhotos) {
  const rows = (PHASES[status] || []).filter((id) => id !== "uploads" || hasPhotos || stage === "uploads");
  const at = rows.indexOf(stage === "music" ? "clips" : stage);
  return rows.map((id, i) => {
    const running = i === at;
    const counted = running && COUNTED[id] && detail?.total;
    return {
      id,
      name: counted ? COUNTED[id](detail) : LABELS[id],
      description: running && stage === "music" ? LABELS.music : null,
      icon: ICONS[id],
      status: at < 0 ? (i === 0 ? "processing" : "pending") : i < at ? "completed" : running ? "processing" : "pending",
    };
  });
}

// Progress while a v2 job runs, or the error when it stopped.
export default function GeneratingStep({ status, stage, progress, detail, hasPhotos, error, onStartAgain, onTryAgain, busy, sessionId }) {
  const target = progress ?? 0;
  const smooth = useSmoothProgress({ target, ceiling: nextStageStart(target), active: status !== "FAILED" });

  if (status === "FAILED") {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-border/40 bg-white p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-terra" />
          <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
          <p className="text-sm text-ink-muted break-words">{error || "The run stopped. Any credits taken were refunded."}</p>
          {onTryAgain && (
            <p className="text-xs text-ink-muted">Your script and voiceover are saved, so picking it up again costs nothing.</p>
          )}
          <div className="flex items-center justify-center gap-2">
            {onTryAgain && (
              <Button onClick={onTryAgain} disabled={busy} style={{ background: "var(--gradient-brand)" }} className="text-white">
                <RefreshCw className="w-4 h-4 mr-2" /> Try again
              </Button>
            )}
            <Button onClick={onStartAgain} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" /> Start again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[70vh] flex items-center">
      <ProgressChecklist
        title={TITLES[status] || "Working on it"}
        caption={status === "GENERATING" ? "This takes a few minutes. You can leave this page, we will email you when it is ready." : null}
        progress={smooth}
        tasks={buildTasks(status, stage, detail, hasPhotos)}
        headerIcon={status === "SCRIPTING" ? PenLine : status === "FRAMING" ? Image : Film}
        sessionId={sessionId}
        logPhase={status === "GENERATING" ? "video" : status === "FRAMING" ? "frames" : "script"}
      />
    </div>
  );
}
