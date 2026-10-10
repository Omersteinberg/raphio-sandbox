import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import { saveReturnTo } from "@/lib/returnTo";
import { describeError } from "@/lib/errorDetail";
import * as sessionService from "@/services/session";
import * as pipelineService from "@/services/pipeline";
import { useSessionBase } from "@/hooks/session/useSessionBase";
import { usePipelineSession } from "@/hooks/session/usePipelineSession";
import BriefStep from "@/components/pipeline/BriefStep";
import ScriptReview from "@/components/pipeline/ScriptReview";
import StoryboardReview from "@/components/pipeline/StoryboardReview";
import GeneratingStep from "@/components/pipeline/GeneratingStep";
import ResultStep from "@/components/session/ResultStep";
import EditingStep from "@/components/session/EditingStep";
import InsufficientCreditsModal from "@/components/session/InsufficientCreditsModal";
import MergeLoadingOverlay from "@/components/merge/MergeLoadingOverlay";

// Photos the front door handed over, as the brief's own photo list.
function photosFromHandoff(handoff) {
  if (!handoff) return [];
  if (handoff.mode === "references") {
    return (handoff.references || []).map((r) => ({
      file: r.file, preview: r.preview, label: r.name || r.description || "",
    }));
  }
  return (handoff.photos || []).map((p) => ({ file: p.file, preview: p.preview, label: "" }));
}

// The v2 pipeline: brief, script gate, storyboard gate, then the finished video.
export default function PipelineCreator({
  mode = "prompt",
  onChromeChange,
  onMergedRunActiveChange,
  handoff = null,
  userPrompt, setUserPrompt,
  style,
  targetDuration, setTargetDuration,
  aspectRatio, setAspectRatio,
  voiceId, setVoiceId,
  backgroundMusic,
  startAgain: onStartAgain,
}) {
  const navigate = useNavigate();
  const base = useSessionBase({ generatingStep: -1, currentStep: 0 });
  const { sessionId, setSessionId, session, refreshSession } = base;
  const pipe = usePipelineSession(sessionId);
  const [photos, setPhotos] = useState(() => photosFromHandoff(handoff));
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState({});
  const [redrawing, setRedrawing] = useState(null);

  useEffect(() => {
    if (handoff) setPhotos(photosFromHandoff(handoff));
  }, [handoff]);

  const status = pipe.status;
  const runDuration = pipe.run?.targetDuration || chosen.targetDuration || session?.targetDuration || targetDuration;
  const done = status === "DONE";
  const [editOverride, setEditOverride] = useState(null);
  const editing = done && (editOverride ?? session?.stage === "EDITING");

  const runShape = pipe.run?.aspectRatio || chosen.aspectRatio || session?.aspectRatio || aspectRatio;
  const runVoice = pipe.run?.voiceId || chosen.voiceId || session?.voiceId || voiceId;

  // The header balance moves when a run ends, refunded or not.
  useEffect(() => {
    if (status === "DONE" || status === "FAILED") base.refreshCredits();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // A redraw is over once the run leaves FRAMING.
  const lastStatus = useRef(status);
  useEffect(() => {
    if (lastStatus.current === "FRAMING" && status !== "FRAMING") setRedrawing(null);
    lastStatus.current = status;
  }, [status]);

  // A finished run needs the session's video row for the result and editor.
  useEffect(() => {
    if (done) refreshSession();
  }, [done, refreshSession]);

  const onBrief = !sessionId || (pipe.loaded && !pipe.run);
  const restoring = Boolean(sessionId) && !pipe.loaded;

  useLayoutEffect(() => {
    const chrome = onBrief && !restoring;
    onChromeChange?.(chrome, chrome || (done && !editing));
  }, [onBrief, restoring, done, editing, onChromeChange]);

  useEffect(() => {
    onMergedRunActiveChange?.(pipe.active);
  }, [pipe.active, onMergedRunActiveChange]);

  const handleError = (err, fallback) => {
    if (err.response?.status === 402) {
      base.setInsufficientCredits({ required: err.response.data.required, available: err.response.data.available });
      return;
    }
    toast.error(describeError(err, fallback).userMessage);
  };

  const start = async () => {
    setBusy(true);
    try {
      // Created as "image": the old runner's sweep leaves that stage alone.
      const created = sessionId ? { id: sessionId } : await sessionService.startSession({
        userPrompt, style, voiceId, pipelineMode: "image", targetDuration, aspectRatio, backgroundMusic,
      });
      setSessionId(created.id);
      await pipelineService.startPipeline(created.id, {
        photos, brief: userPrompt, targetDuration, aspectRatio, voiceId, style,
      });
      pipe.markStatus("SCRIPTING");
      pipe.refresh();
    } catch (err) {
      handleError(err, "Could not start your video");
      if (handoff?.autostart && err.response?.status !== 402) backToBrief();
    } finally {
      setBusy(false);
    }
  };

  const runGate = (call, nextStatus, fallback) => async (...args) => {
    setBusy(true);
    try {
      const res = await call(sessionId, ...args);
      pipe.markStatus(nextStatus);
      pipe.refresh();
      return res || true;
    } catch (err) {
      handleError(err, fallback);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveScript = runGate(pipelineService.editScript, "SCRIPTING", "Could not save your script");
  const approveScript = runGate(pipelineService.approveScript, "FRAMING", "Could not approve the script");
  const chargeFrames = runGate(pipelineService.approveFrames, "GENERATING", "Could not start the video");
  const regenerate = runGate(pipelineService.regenerateScript, "SCRIPTING", "Could not rewrite the script");
  const redraw = runGate(pipelineService.redrawStills, "FRAMING", "Could not redraw the frames");

  // Second gate: the header balance drops as soon as the charge lands.
  const approveFrames = async () => {
    const res = await chargeFrames();
    if (!res) return;
    base.refreshCredits();
  };

  // A rewrite with new choices carries them back to the Creator too.
  const rewriteScript = async (input = {}) => {
    const res = await regenerate(input);
    if (!res) return false;
    if (input.targetDuration) setTargetDuration?.(input.targetDuration);
    if (input.aspectRatio) setAspectRatio?.(input.aspectRatio);
    if (input.voiceId) setVoiceId?.(input.voiceId);
    setChosen((prev) => ({ ...prev, ...input }));
    return true;
  };

  // Redraw one clip's frames while the rest stay on screen.
  const redrawClip = async (clipIndex) => {
    setRedrawing(clipIndex);
    if (!(await redraw(clipIndex))) setRedrawing(null);
  };

  // Leave the storyboard for the script; the call answers with the reopened run.
  const backToScript = async () => {
    setBusy(true);
    try {
      const state = await pipelineService.backToScript(sessionId);
      if (state) pipe.setRun(state);
      else await pipe.refresh();
    } catch (err) {
      handleError(err, "Could not go back to the script");
    } finally {
      setBusy(false);
    }
  };

  // The front door already collected every choice, so its handoff starts the script at once.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!handoff?.autostart || autoStarted.current || sessionId) return;
    autoStarted.current = true;
    start();
  }, [handoff]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAgain = () => {
    base.resetBase();
    setPhotos([]);
    setChosen({});
    navigate("/create", { replace: true });
  };

  // Back from the script returns to the front door with the brief kept.
  const backToBrief = () => {
    base.resetBase();
    setChosen({});
    if (onStartAgain) onStartAgain();
    else navigate("/create", { replace: true });
  };

  const topUp = () => {
    saveReturnTo(window.location.pathname + window.location.search);
    navigate("/buy-credits");
  };

  const renderStep = () => {
    if (restoring) return <MergeLoadingOverlay text="Loading your video..." />;
    if (onBrief && handoff?.autostart && (busy || (!autoStarted.current && !sessionId))) return <MergeLoadingOverlay text="Writing your script..." />;
    if (onBrief) {
      return (
        <BriefStep
          mode={mode}
          userPrompt={userPrompt} setUserPrompt={setUserPrompt}
          photos={photos} setPhotos={setPhotos}
          targetDuration={targetDuration} setTargetDuration={setTargetDuration}
          aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
          voiceId={voiceId} setVoiceId={setVoiceId}
          onStart={start}
          starting={busy}
        />
      );
    }
    if (status === "AWAITING_SCRIPT") {
      return (
        <ScriptReview
          plan={pipe.plan}
          videoSeconds={pipe.run?.videoSeconds}
          targetDuration={runDuration}
          aspectRatio={runShape}
          voiceId={runVoice}
          onSave={saveScript}
          onApprove={approveScript}
          onBack={backToBrief}
          onRegenerate={rewriteScript}
          busy={busy}
        />
      );
    }
    if (status === "AWAITING_FRAMES" || (status === "FRAMING" && redrawing != null)) {
      return (
        <StoryboardReview
          plan={pipe.plan}
          storyboard={pipe.storyboard}
          aspectRatio={runShape}
          targetDuration={runDuration}
          onApprove={approveFrames}
          onTopUp={topUp}
          onRedraw={pipe.run?.charged ? undefined : redrawClip}
          onBack={pipe.run?.charged ? undefined : backToScript}
          redrawing={redrawing}
          framing={status === "FRAMING"}
          busy={busy}
        />
      );
    }
    if (editing) {
      return (
        <EditingStep
          session={session}
          sessionId={sessionId}
          updateClip={base.updateClip}
          regenerateNarration={base.regenerateNarration}
          goToResult={() => setEditOverride(false)}
          refreshSession={refreshSession}
        />
      );
    }
    if (done) {
      return (
        <ResultStep
          finalVideoUrl={base.finalVideoUrl || pipe.run?.finalUrl}
          scriptData={session?.scriptData}
          session={session}
          enterEditingMode={async () => { await base.enterEditingMode(); setEditOverride(true); }}
          reset={startAgain}
        />
      );
    }
    return (
      <GeneratingStep
        status={status}
        stage={pipe.run?.stage}
        progress={pipe.progress}
        detail={pipe.run?.detail}
        hasPhotos={photos.length > 0}
        error={pipe.run?.error}
        sessionId={sessionId}
        onStartAgain={startAgain}
        onTryAgain={pipe.run?.gates?.script ? approveScript : undefined}
        busy={busy}
      />
    );
  };

  return (
    <div className="w-full h-full">
      {renderStep()}
      {base.insufficientCredits && (
        <InsufficientCreditsModal
          required={base.insufficientCredits.required}
          available={base.insufficientCredits.available}
          onClose={base.dismissInsufficientCredits}
        />
      )}
    </div>
  );
}
