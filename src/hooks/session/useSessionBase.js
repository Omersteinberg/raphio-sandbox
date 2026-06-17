import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as sessionService from "@/services/session";
import { useAuth } from "@/hooks/useAuth";
import { STYLE_OPTIONS } from '../../constants/styles';

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
 * useSessionBase — shared state, callbacks, and effects for all session pipelines.
 *
 * @param {object} opts
 * @param {number} opts.generatingStep — the step number that represents "generating" in the
 *   consuming pipeline.  The polling effect fires when `currentStep === generatingStep`.
 * @param {number} opts.currentStep — the pipeline's current step (so base can drive polling).
 * @param {function} opts.onSessionLoaded — optional callback invoked with the loaded session
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
  const [style, setStyle] = useState("realistic");
  const [targetDuration, setTargetDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceId, setVoiceId] = useState("adam");
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(true);

  // ── Script state ───────────────────────────────────────────────────
  const [scriptData, setScriptData] = useState(null);
  const [editRequest, setEditRequest] = useState("");

  // ── Progress / credits ─────────────────────────────────────────────
  const [scriptProgress, setScriptProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [insufficientCredits, setInsufficientCredits] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

  // ── Sync sessionId to URL so refresh restores the session ──────────
  useEffect(() => {
    const currentParam = searchParams.get("session");
    if (sessionId && currentParam !== sessionId) {
      setSearchParams({ session: sessionId }, { replace: true });
    } else if (!sessionId && currentParam) {
      setSearchParams({}, { replace: true });
    }
  }, [sessionId, searchParams, setSearchParams]);

  // ── Resume session from query param ────────────────────────────────
  const resumeSessionId = searchParams.get("session");
  useEffect(() => {
    if (resumeSessionId && !sessionId) {
      const loadSession = async () => {
        try {
          setLoading(true);
          const data = await sessionService.getSession(resumeSessionId);
          if (data) {
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
  }, [resumeSessionId, sessionId, navigate]);
  // NOTE: onSessionLoaded intentionally omitted from deps — it is a stable ref
  // provided by the consuming hook and including it would cause infinite re-renders.

  // ── Poll for session updates during generation ─────────────────────
  useEffect(() => {
    let pollInterval;

    if (sessionId && currentStep === generatingStep) {
      pollInterval = setInterval(async () => {
        try {
          const updatedSession = await sessionService.getSession(sessionId);
          setSession(updatedSession);

          if (updatedSession.stage === "COMPLETED") {
            clearInterval(pollInterval);
            setFinalVideoUrl(updatedSession.video?.finalVideoUrl);
            refreshCredits();
            toast.success("Video generation complete!");
          }
        } catch (err) {
          console.error("Error polling session:", err);
        }
      }, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, currentStep, generatingStep]);

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
      console.error("[useSessionBase] approveScript failed:", err);
      console.error("[useSessionBase] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error("Failed to approve script");
    } finally {
      setLoading(false);
    }
  }, [sessionId, scriptData]);

  // Start generation — accepts a generic config object from the pipeline hook
  const startGeneration = useCallback(async (config = {}) => {
    console.log("[useSessionBase] startGeneration called");
    console.log("[useSessionBase] sessionId:", sessionId);
    console.log("[useSessionBase] config:", config);

    if (!sessionId) {
      console.log("[useSessionBase] No sessionId, aborting startGeneration");
      return;
    }

    try {
      console.log("[useSessionBase] Calling sessionService.startGeneration...");
      const updatedSession = await sessionService.startGeneration(sessionId, {
        videoModel: config.videoModel || videoModel,
        voiceId: config.voiceId || voiceId,
        backgroundMusic: config.backgroundMusic !== undefined ? config.backgroundMusic : backgroundMusic,
      });
      console.log("[useSessionBase] startGeneration response:", updatedSession);
      setSession(updatedSession);
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
      // Insufficient credits — let pipeline hook handle step changes
      if (err.response?.status === 402) {
        setInsufficientCredits({
          required: err.response.data.required,
          available: err.response.data.available,
        });
        return { success: false, reason: "insufficient_credits", error: err };
      }
      // Network errors (timeout/CORS) likely mean generation is still running
      if (err.code === "ERR_NETWORK" || !err.response) {
        console.log("[useSessionBase] Network error - generation likely running in background");
        toast.info("Generation in progress... please wait");
        return { success: false, reason: "network_error", error: err };
      }
      // Actual server error
      toast.error("Failed to start generation");
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
      console.error("[useSessionBase] regenerateNarration failed:", err);
      console.error("[useSessionBase] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error("Failed to regenerate narration");
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
      toast.error("Failed to reassemble video");
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

  // Reset shared state — pipeline hooks should call this and then reset their own state
  const resetBase = useCallback(() => {
    setSessionId(null);
    setSession(null);
    setDirection(0);
    setUserPrompt("");
    setStyle("cinematic");
    setAspectRatio("16:9");
    setVoiceId("adam");
    setVideoModel("KLING");
    setBackgroundMusic(true);
    setScriptData(null);
    setEditRequest("");
    setScriptProgress(0);
    setGenerationProgress(null);
    setInsufficientCredits(null);
    setFinalVideoUrl(null);
    setError(null);
  }, []);

  return {
    // Session
    sessionId,
    setSessionId,
    session,
    setSession,
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
    finalVideoUrl,
    setFinalVideoUrl,
    dismissInsufficientCredits,

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
