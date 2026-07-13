import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/toast";
import * as sessionService from "@/services/session";
import { useAuth } from "@/hooks/useAuth";
import { getCreationDefaults, saveCreationDefaults } from "@/lib/preferences";
import { STYLE_OPTIONS } from '../../constants/styles';
import { detectScriptJobOnResume, attachToRunningScriptJob, notifyScriptJobFailedOnResume, scriptProgressForResumedSession } from "./scriptJobResume";
import { resetGenLog, logFailure, logEvent, logObserve } from "@/lib/genLog";
import { isGenerationFailed, clearVideoFailure } from "@/lib/progressTasks";
import { resumeModeFor } from "@/lib/pipelineMode";
import { describeError } from "@/lib/errorDetail";

// Session stages matching backend
export const STAGES = {
  PROMPT: "PROMPT",
  IMAGES: "IMAGES",
  ANALYSIS: "ANALYSIS",
  SCRIPT: "SCRIPT",
  FRAMES: "FRAMES",
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  EDITING: "EDITING",
};

/**
 * useSessionBase: shared state, callbacks, and effects for all session pipelines.
 *
 * @param {object} opts
 * @param {number} opts.generatingStep - the step number that represents "generating" in the
 *   consuming pipeline.  The polling effect fires when `currentStep === generatingStep`.
 * @param {number} opts.currentStep - the pipeline's current step (so base can drive polling).
 * @param {function} opts.onSessionLoaded - optional callback invoked with the loaded session
 *   during URL-param resume, so the pipeline hook can restore pipeline-specific state
 *   (e.g. images, character data). Called with (sessionData).
 */
export function useSessionBase({ generatingStep, currentStep, onSessionLoaded } = {}) {
  const navigate = useNavigate();
  const { credits, refreshCredits } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Session state ──────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Form state ─────────────────────────────────────────────────────
  const [userPrompt, setUserPrompt] = useState("");
  // Last-used creation choices (saved defaults) - read once on mount. The
  // references pipeline supports the full style palette, so no style
  // validation here (unlike useSession.js).
  const [savedDefaults] = useState(getCreationDefaults);
  const [style, setStyle] = useState(savedDefaults.style);
  const [targetDuration, setTargetDuration] = useState(savedDefaults.targetDuration);
  const [aspectRatio, setAspectRatio] = useState(savedDefaults.aspectRatio);
  const [voiceId, setVoiceId] = useState(savedDefaults.voiceId);
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(savedDefaults.backgroundMusic);

  // ── Script state ───────────────────────────────────────────────────
  const [scriptData, setScriptData] = useState(null);
  const [editRequest, setEditRequest] = useState("");

  // ── Progress / credits ─────────────────────────────────────────────
  const [scriptProgress, setScriptProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [insufficientCredits, setInsufficientCredits] = useState(null);
  const [providerUnavailable, setProviderUnavailable] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  // The FAILED session payload, held separately from `session`. See the polling
  // effect below for why it cannot go through setSession.
  const [failedSession, setFailedSession] = useState(null);

  // Auto-save last-used choices so the next new video starts from them.
  // Also fires when a resumed session loads its values ("last touched wins").
  useEffect(() => {
    saveCreationDefaults({ style, targetDuration, aspectRatio, voiceId, backgroundMusic });
  }, [style, targetDuration, aspectRatio, voiceId, backgroundMusic]);

  // ── Sync sessionId to URL so refresh restores the session ──────────
  useEffect(() => {
    const currentParam = searchParams.get("session");
    const mode = searchParams.get("mode");
    if (sessionId && currentParam !== sessionId) {
      const next = { session: sessionId };
      if (mode) next.mode = mode; // keep so a refresh still loads the right pipeline
      setSearchParams(next, { replace: true });
    } else if (!sessionId && currentParam) {
      setSearchParams({}, { replace: true });
    }
  }, [sessionId, searchParams, setSearchParams]);

  // ── Resume session from query param ────────────────────────────────
  const resumeSessionId = searchParams.get("session");
  const resumeModeParam = searchParams.get("mode");
  useEffect(() => {
    if (resumeSessionId && !sessionId) {
      const loadSession = async () => {
        try {
          setLoading(true);
          const data = await sessionService.getSession(resumeSessionId);
          if (data) {
            // Wrong creator for this session's pipeline, bounce to the right one.
            // Keyed on the URL's mode, not `expectedMode`: a "prompt" session landing
            // here (WelcomeHero omits &mode=, so localStorage picks the creator) must
            // bounce out to ?mode=prompt, and expectedMode alone never caught that.
            const correctedMode = resumeModeFor(data.pipelineMode, resumeModeParam);
            if (correctedMode) {
              navigate(`/create?session=${resumeSessionId}&mode=${correctedMode}`, { replace: true });
              return;
            }
            logEvent("client.resume", {
              sessionId: resumeSessionId,
              stage: data.stage,
              pipelineMode: data.pipelineMode,
              videoStatus: data.video?.status ?? null,
              jobType: data.jobType ?? null,
              jobStatus: data.jobStatus ?? null,
              generationAttempts: data.generationAttempts ?? 0,
              autoApprove: data.autoApprove ?? null,
            });
            setSessionId(resumeSessionId);
            setSession(data);
            if (data.userPrompt) setUserPrompt(data.userPrompt);
            if (data.style) setStyle(data.style);
            if (data.aspectRatio) setAspectRatio(data.aspectRatio);
            if (data.voiceId) setVoiceId(data.voiceId);
            if (data.videoModel) setVideoModel(data.videoModel);
            if (data.scriptData) setScriptData(data.scriptData);
            // Let pipeline-specific hook restore its own state
            if (onSessionLoaded) onSessionLoaded(data);

            // The script job runs detached in the backend, so it may still be
            // generating (or have failed) from before the user navigated away.
            // Re-attach to the OLD session's job instead of dropping the user
            // on a stale step with no sign anything is happening. Keeping
            // `loading` true keeps the pipeline's loading screen up. 20-98
            // sits past the "approving references" band of the references
            // loader's sub-steps, which is already done by this point.
            // The checklist's script rows are driven by this tab-local
            // progress state, so a resumed/retried session must reflect the
            // steps that already happened on the backend - derive the floor
            // from the session's durable state (images, analysis, script).
            const resumedProgress = scriptProgressForResumedSession(data);
            const jobState = detectScriptJobOnResume(data);
            if (jobState === "running") {
              await attachToRunningScriptJob({
                sessionId: resumeSessionId,
                jobType: data.jobType,
                setSession,
                setScriptData,
                setScriptProgress,
                // Start from the already-done floor so completed rows (e.g.
                // upload/analyze in the photos flow) light up immediately;
                // never below 20, which sits past the references loader's
                // "approving references" band that is already done here.
                progressBand: [Math.max(20, resumedProgress), 98],
              });
              // A failure refund may have landed while polling.
              refreshCredits();
            } else if (jobState === "failed") {
              notifyScriptJobFailedOnResume(data);
            } else {
              setScriptProgress(resumedProgress);
            }
          }
        } catch (err) {
          console.error("[useSessionBase] Failed to load session:", err);
          toast.error("Failed to load session");
          navigate("/videos");
        } finally {
          setLoading(false);
        }
      };
      loadSession();
    }
  }, [resumeSessionId, resumeModeParam, sessionId, navigate]);
  // NOTE: onSessionLoaded intentionally omitted from deps, it is a stable ref
  // provided by the consuming hook and including it would cause infinite re-renders.

  // ── Poll for session updates during generation ─────────────────────
  useEffect(() => {
    let pollInterval;
    const startedAt = Date.now();
    const GIVE_UP_MS = 20 * 60 * 1000; // backstop; backend watchdog fails at 15m

    if (sessionId && currentStep === generatingStep && !generationError) {
      pollInterval = setInterval(async () => {
        try {
          const updatedSession = await sessionService.getSession(sessionId);

          logObserve(`${sessionId}:poll`, "client.poll", {
            sessionId,
            stage: updatedSession.stage,
            videoStatus: updatedSession.video?.status ?? null,
            progressStage: updatedSession.video?.progressData?.stage ?? null,
          });

          // A fresh re-gen can no longer be pointing at the previous FAILED video:
          // claimGenerationLock clears that marker as it flips to GENERATING.
          if (isGenerationFailed(updatedSession)) {
            clearInterval(pollInterval);
            const msg = updatedSession.video?.progressData?.error || "Video generation failed. Please try again.";
            // Capture the FAILED payload separately: setSession would apply the
            // backend's stage rollback to SCRIPT_APPROVED and bounce the user off
            // the generating screen before they read the error. The checklist
            // needs this snapshot to know which step died.
            setFailedSession(updatedSession);
            setGenerationError(msg);
            logFailure({
              phase: "video",
              stepId: "generation",
              reason: msg,
              sessionId,
              body: updatedSession.video?.progressData,
            });
            refreshCredits();
            toast.error(msg);
            return;
          }

          setSession(updatedSession);

          if (updatedSession.stage === "COMPLETED") {
            clearInterval(pollInterval);
            setFinalVideoUrl(updatedSession.video?.finalVideoUrl);
            refreshCredits();
            toast.success("Video generation complete!");
            return;
          }

          if (Date.now() - startedAt > GIVE_UP_MS) {
            clearInterval(pollInterval);
            const msg = "Generation is taking longer than expected. Please check back shortly or try again.";
            setGenerationError(msg);
            logFailure({
              phase: "video",
              stepId: "generation",
              reason: msg,
              sessionId,
              body: { clientTimeoutMs: GIVE_UP_MS, lastStage: updatedSession.video?.progressData?.stage },
            });
            refreshCredits();
            toast.error(msg);
          }
        } catch (err) {
          console.error("Error polling session:", err);
        }
      }, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, currentStep, generatingStep, generationError]);

  // ── Shared callbacks ───────────────────────────────────────────────

  // Edit script with AI
  const editScriptWithAI = useCallback(async () => {
    if (!sessionId || !editRequest.trim()) return;

    setLoading(true);
    try {
      const updatedSession = await sessionService.updateScript(sessionId, {
        editRequest,
      });
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);
      setEditRequest("");
      toast.success("Script updated with AI!");
    } catch (err) {
      toast.error("Failed to edit script");
    } finally {
      setLoading(false);
    }
  }, [sessionId, editRequest]);

  // Approve script
  const approveScript = useCallback(async () => {
    console.log("[useSessionBase] approveScript called");
    console.log("[useSessionBase] sessionId:", sessionId);

    if (!sessionId) {
      console.log("[useSessionBase] No sessionId, aborting approveScript");
      return;
    }

    setLoading(true);
    try {
      // First, save any local script edits to the backend
      if (scriptData) {
        console.log("[useSessionBase] Saving local script edits before approving...");
        await sessionService.updateScript(sessionId, { scriptData });
        console.log("[useSessionBase] Local script edits saved");
      }

      console.log("[useSessionBase] Calling sessionService.approveScript...");
      const updatedSession = await sessionService.approveScript(sessionId);
      console.log("[useSessionBase] approveScript response:", updatedSession);
      console.log("[useSessionBase] New stage:", updatedSession?.stage);

      setSession(updatedSession);
      toast.success("Script approved!");
    } catch (err) {
      const { userMessage, logDetail, status } = describeError(err, "Failed to approve script");
      logFailure({ phase: "script", stepId: "approve-script", reason: userMessage, status, body: logDetail, err, sessionId });
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId, scriptData]);

  // Start generation: accepts a generic config object from the pipeline hook
  const startGeneration = useCallback(async (config = {}) => {
    console.log("[useSessionBase] startGeneration called");
    console.log("[useSessionBase] sessionId:", sessionId);
    console.log("[useSessionBase] config:", config);

    if (!sessionId) {
      console.log("[useSessionBase] No sessionId, aborting startGeneration");
      return;
    }

    // A retry must be able to report its own failures, not be deduped against
    // the previous run's.
    resetGenLog();
    setFailedSession(null);
    setSession(clearVideoFailure);

    try {
      console.log("[useSessionBase] Calling sessionService.startGeneration...");
      const updatedSession = await sessionService.startGeneration(sessionId, {
        videoModel: config.videoModel || videoModel,
        voiceId: config.voiceId || voiceId,
        backgroundMusic: config.backgroundMusic !== undefined ? config.backgroundMusic : backgroundMusic,
      });
      console.log("[useSessionBase] startGeneration response:", updatedSession);
      // Do NOT setSession here, the 202 response is a stub, not a full session;
      // the poll refreshes the real session within ~5s.
      refreshCredits();
      toast.success("Video generation started!");
      return { success: true, session: updatedSession };
    } catch (err) {
      console.error("[useSessionBase] startGeneration failed:", err);
      console.error("[useSessionBase] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      // Insufficient credits: let pipeline hook handle step changes
      if (err.response?.status === 402) {
        setInsufficientCredits({
          required: err.response.data.required,
          available: err.response.data.available,
        });
        return { success: false, reason: "insufficient_credits", error: err };
      }
      // 409 = a generation for this session is already running (e.g. a
      // duplicate submit): treat as success so the caller stays on the
      // generating step and polling picks up its progress.
      if (err.response?.status === 409) {
        console.log("[useSessionBase] 409 - generation already in progress");
        toast.info("Generation already in progress...");
        return { success: true, alreadyRunning: true };
      }
      // Network errors (timeout/CORS) likely mean generation is still running
      if (err.code === "ERR_NETWORK" || !err.response) {
        console.log("[useSessionBase] Network error - generation likely running in background");
        toast.info("Generation in progress... please wait");
        return { success: false, reason: "network_error", error: err };
      }
      // Actual server error
      const { userMessage, logDetail, status } = describeError(err, "Failed to start generation");
      logFailure({ phase: "video", stepId: "start-generation", reason: userMessage, status, body: logDetail, err, sessionId });
      toast.error(userMessage);
      return { success: false, reason: "server_error", error: err };
    }
  }, [sessionId, videoModel, voiceId, backgroundMusic]);

  // Update script directly
  const updateScript = useCallback(async (newScriptData) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const updatedSession = await sessionService.updateScript(sessionId, {
        scriptData: newScriptData,
      });
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);
      toast.success("Script updated!");
    } catch (err) {
      toast.error("Failed to update script");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Update section/clip
  const updateClip = useCallback(async (clipId, updates) => {
    if (!sessionId) return;

    try {
      await sessionService.updateClip(sessionId, clipId, updates);
      const updatedSession = await sessionService.getSession(sessionId);
      setSession(updatedSession);
      toast.success("Clip updated!");
    } catch (err) {
      toast.error("Failed to update clip");
    }
  }, [sessionId]);

  // Regenerate clip
  const regenerateClip = useCallback(async (clipId, options = {}) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      await sessionService.regenerateClip(sessionId, clipId, options);
      const updatedSession = await sessionService.getSession(sessionId);
      setSession(updatedSession);
      toast.success("Clip regenerated!");
    } catch (err) {
      if (err.response?.status === 402) {
        setInsufficientCredits({
          required: err.response.data.required,
          available: err.response.data.available,
        });
        return;
      }
      toast.error("Failed to regenerate clip");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Regenerate narration for a single clip
  const regenerateNarration = useCallback(async (clipId, options = {}) => {
    console.log("[useSessionBase] regenerateNarration called");
    console.log("[useSessionBase] sessionId:", sessionId);
    console.log("[useSessionBase] clipId:", clipId);
    console.log("[useSessionBase] options:", options);

    if (!sessionId) {
      console.warn("[useSessionBase] No sessionId, aborting regenerateNarration");
      return;
    }

    setLoading(true);
    try {
      console.log("[useSessionBase] Calling sessionService.regenerateNarration...");
      const result = await sessionService.regenerateNarration(sessionId, clipId, options);
      console.log("[useSessionBase] sessionService.regenerateNarration result:", result);
      const updatedSession = await sessionService.getSession(sessionId);
      console.log("[useSessionBase] Updated session after regeneration:", updatedSession);
      setSession(updatedSession);
      toast.success("Narration regenerated!");
    } catch (err) {
      const { userMessage, logDetail, status } = describeError(err, "Failed to regenerate narration");
      logFailure({ phase: "editing", stepId: "regenerate-narration", reason: userMessage, status, body: logDetail, err, sessionId });
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Reorder clips
  const reorderClips = useCallback(async (newOrder) => {
    if (!sessionId) return;

    try {
      await sessionService.reorderClips(sessionId, newOrder);
      const updatedSession = await sessionService.getSession(sessionId);
      setSession(updatedSession);
      toast.success("Clips reordered!");
    } catch (err) {
      toast.error("Failed to reorder clips");
    }
  }, [sessionId]);

  // Reassemble video
  const reassembleVideo = useCallback(async (options = {}) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const result = await sessionService.reassembleVideo(sessionId, options);
      setFinalVideoUrl(result.finalVideoUrl);
      const updatedSession = await sessionService.getSession(sessionId);
      setSession(updatedSession);
      toast.success("Video reassembled!");
    } catch (err) {
      const { userMessage, logDetail, status } = describeError(err, "Failed to reassemble video");
      logFailure({ phase: "editing", stepId: "reassemble", reason: userMessage, status, body: logDetail, err, sessionId });
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Delete clip
  const deleteClip = useCallback(async (clipId) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      await sessionService.deleteClip(sessionId, clipId);
      const updatedSession = await sessionService.getSession(sessionId);
      setSession(updatedSession);
      toast.success("Clip deleted!");
    } catch (err) {
      toast.error("Failed to delete clip");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Enter editing mode
  const enterEditingMode = useCallback(async () => {
    if (!sessionId) return;

    try {
      const updatedSession = await sessionService.enterEditingMode(sessionId);
      setSession(updatedSession);
    } catch (err) {
      toast.error("Failed to enter editing mode");
    }
  }, [sessionId]);

  // Mark session as completed
  const completeSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const updatedSession = await sessionService.completeSession(sessionId);
      setSession(updatedSession);
    } catch (err) {
      console.error("Failed to complete session:", err);
    }
  }, [sessionId]);

  // Refresh session data from the server
  const refreshSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const updatedSession = await sessionService.getSession(sessionId);
      setSession(updatedSession);
      if (updatedSession.video?.finalVideoUrl) {
        setFinalVideoUrl(updatedSession.video.finalVideoUrl);
      }
      return updatedSession;
    } catch (err) {
      console.error("Failed to refresh session:", err);
    }
  }, [sessionId]);

  // Dismiss insufficient credits modal
  const dismissInsufficientCredits = useCallback(() => {
    setInsufficientCredits(null);
  }, []);

  const dismissProviderUnavailable = useCallback(() => {
    setProviderUnavailable(null);
  }, []);

  // Reset shared state: pipeline hooks should call this and then reset their own state
  const resetBase = useCallback(() => {
    setSessionId(null);
    setSession(null);
    setDirection(0);
    setUserPrompt("");
    // Restore saved defaults, not factory values - otherwise the auto-save
    // effect would overwrite the user's saved choices on every reset. (This
    // also aligns the reset style with the mount default; it was "cinematic"
    // here but "realistic" on mount.)
    const defaults = getCreationDefaults();
    setStyle(defaults.style);
    setAspectRatio(defaults.aspectRatio);
    setVoiceId(defaults.voiceId);
    setVideoModel("KLING");
    setBackgroundMusic(defaults.backgroundMusic);
    setScriptData(null);
    setEditRequest("");
    setScriptProgress(0);
    setGenerationProgress(null);
    setInsufficientCredits(null);
    setProviderUnavailable(null);
    setFinalVideoUrl(null);
    setGenerationError(null);
    setError(null);
  }, []);

  return {
    // Session
    sessionId,
    setSessionId,
    session,
    setSession,
    // True from mount until the `?session=` fetch lands. Progress derived from
    // `session` reads 0 in that window, so the bar must stay hidden rather than
    // flash 0% at someone resuming a run that is 60% done.
    sessionRestoring: !!resumeSessionId && !sessionId,
    direction,
    setDirection,
    loading,
    setLoading,
    error,
    setError,

    // Form state
    userPrompt,
    setUserPrompt,
    style,
    setStyle,
    targetDuration,
    setTargetDuration,
    aspectRatio,
    setAspectRatio,
    voiceId,
    setVoiceId,
    videoModel,
    setVideoModel,
    backgroundMusic,
    setBackgroundMusic,

    // Script
    scriptData,
    setScriptData,
    editRequest,
    setEditRequest,

    // Progress / credits
    scriptProgress,
    setScriptProgress,
    generationProgress,
    setGenerationProgress,
    insufficientCredits,
    setInsufficientCredits,
    providerUnavailable,
    setProviderUnavailable,
    finalVideoUrl,
    setFinalVideoUrl,
    generationError,
    setGenerationError,
    failedSession,
    setFailedSession,
    dismissInsufficientCredits,
    dismissProviderUnavailable,

    // Shared callbacks
    editScriptWithAI,
    approveScript,
    startGeneration,
    updateScript,
    updateClip,
    regenerateClip,
    regenerateNarration,
    reorderClips,
    reassembleVideo,
    deleteClip,
    enterEditingMode,
    completeSession,
    refreshSession,
    resetBase,

    // Constants
    STYLE_OPTIONS,
    STAGES,

    // Internals exposed for pipeline hooks
    navigate,
    credits,
    refreshCredits,
    searchParams,
    setSearchParams,
  };
}
