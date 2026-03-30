import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import * as sessionService from "@/services/session";
import * as characterApi from "@/services/character";
import { useSessionBase, STAGES } from "./useSessionBase";
import { STYLE_OPTIONS } from "../../constants/styles";

// Map backend character-pipeline stages to frontend step numbers
const CHAR_STAGE_TO_STEP = {
  CHAR_PROMPT_ENTERED: 0,
  CHAR_CHARACTER_UPLOADED: 0,
  CHAR_CHARACTER_LOCKED: 1,
  CHAR_SCRIPT_GENERATED: 2,
  CHAR_SCRIPT_APPROVED: 2,
  CHAR_FRAMES_GENERATED: 3,
  CHAR_FRAMES_APPROVED: 3,
  CHAR_VOICE_CONFIGURED: 4,
  GENERATING: 5,
  COMPLETED: 6,
  EDITING: 7,
  // Fallbacks for shared stages (in case backend uses non-prefixed names)
  SCRIPT_GENERATED: 2,
  SCRIPT_APPROVED: 2,
};

export function useCharacterSession() {
  // ── Character-pipeline step state ───────────────────────────────────
  const [step, setStep] = useState(0);

  // Stable ref for onSessionLoaded so base hook doesn't re-trigger effect
  const onSessionLoadedRef = useRef(null);

  // ── Base hook ───────────────────────────────────────────────────────
  const base = useSessionBase({
    generatingStep: 5,
    currentStep: step,
    onSessionLoaded: (data) => {
      if (onSessionLoadedRef.current) onSessionLoadedRef.current(data);
    },
  });

  const {
    sessionId, setSessionId, session, setSession,
    direction, setDirection, loading, setLoading,
    error, setError,
    userPrompt, style, voiceId, videoModel, backgroundMusic,
    scriptData, setScriptData,
    setScriptProgress,
    setInsufficientCredits,
    setFinalVideoUrl,
    navigate, refreshCredits,
    startGeneration: baseStartGeneration,
    resetBase,
  } = base;

  // ── Character-pipeline specific state ───────────────────────────────
  const [character, setCharacter] = useState({
    name: "",
    description: "",
    referenceImage: null, // preview URL
    referenceFile: null,  // File object
    useUpload: true,      // true = upload image, false = AI generate
  });
  const [lockedImage, setLockedImage] = useState(null);
  const [characterApproved, setCharacterApproved] = useState(false);
  const [sceneFrames, setSceneFrames] = useState([]);
  const [lockLoading, setLockLoading] = useState(false);
  const [framesLoading, setFramesLoading] = useState(false);
  const [lockRegenerateCount, setLockRegenerateCount] = useState(0);

  // ── Restore character-specific state when resuming a session ────────
  onSessionLoadedRef.current = (data) => {
    if (data.character) {
      setCharacter((prev) => ({
        ...prev,
        name: data.character.name || prev.name,
        description: data.character.description || prev.description,
        referenceImage: data.character.referenceImageUrl || prev.referenceImage,
      }));
    }
    if (data.lockedImage || data.character?.lockedUrl || data.character?.lockedImageUrl) {
      setLockedImage(data.lockedImage || data.character?.lockedUrl || data.character?.lockedImageUrl);
      setCharacterApproved(true);
    }
    if (data.sceneFrames?.length) {
      setSceneFrames(data.sceneFrames);
    }
  };

  // ── Sync step with session stage (character pipeline mapping) ───────
  useEffect(() => {
    if (session?.stage) {
      const newStep = CHAR_STAGE_TO_STEP[session.stage] ?? 0;
      console.log("[useCharacterSession] Stage sync:", session.stage, "-> step", newStep);

      if (newStep !== step) {
        setDirection(newStep > step ? 1 : -1);
        setStep(newStep);
      }

      // Update local state from session
      if (session.character) {
        setCharacter((prev) => ({
          ...prev,
          name: session.character.name || prev.name,
          description: session.character.description || prev.description,
          referenceImage: session.character.referenceImageUrl || prev.referenceImage,
        }));
        if (session.character.lockedUrl || session.character.lockedImageUrl) {
          setLockedImage(session.character.lockedUrl || session.character.lockedImageUrl);
        }
      }
      if (session.scriptData) {
        console.log("[useCharacterSession] useEffect setting scriptData from session:", session.scriptData);
        console.log("[useCharacterSession] useEffect scriptData.sections:", session.scriptData?.sections);
        setScriptData(session.scriptData);
      } else {
        console.log("[useCharacterSession] useEffect — session.scriptData is falsy:", session.scriptData);
      }
      if (session.sceneFrames?.length) {
        setSceneFrames(session.sceneFrames);
      }
      if (session.video?.finalVideoUrl) {
        setFinalVideoUrl(session.video.finalVideoUrl);
      }
      if (session.videoModel) {
        base.setVideoModel(session.videoModel);
      }
    }
  }, [session]);

  // ── Start character session ─────────────────────────────────────────
  const startCharacterSession = useCallback(async () => {
    console.log("[useCharacterSession] startCharacterSession called");

    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (!character.name.trim()) {
      toast.error("Please enter a character name");
      return;
    }
    if (!character.description.trim()) {
      toast.error("Please enter a character description");
      return;
    }
    if (character.useUpload && !character.referenceFile) {
      toast.error("Please upload a character reference image");
      return;
    }

    setLoading(true);
    setError(null);
    setScriptProgress(0);

    try {
      // Step 1: Create the session
      console.log("[useCharacterSession] Creating session...");
      setScriptProgress(5);
      const newSession = await sessionService.startSession({
        userPrompt,
        style,
        pipelineMode: "character",
        voiceId,
        imageDuration: 5,
      });
      console.log("[useCharacterSession] Session created:", newSession);
      setScriptProgress(15);

      setSessionId(newSession.id);
      setSession(newSession);

      // Step 2: Upload or generate character
      if (character.useUpload) {
        // Upload mode — existing flow
        console.log("[useCharacterSession] Uploading character...");
        setScriptProgress(30);
        await characterApi.uploadCharacter(newSession.id, {
          name: character.name,
          description: character.description,
          imageFile: character.referenceFile,
        });
        console.log("[useCharacterSession] Character uploaded");
      } else {
        // AI Generate mode — new flow
        console.log("[useCharacterSession] Generating character from description...");
        setScriptProgress(30);
        await characterApi.generateCharacterImage(newSession.id, {
          name: character.name,
          description: character.description,
        });
        console.log("[useCharacterSession] Character generated from description");
      }
      setScriptProgress(50);

      // Step 3: Lock character (generate consistent version)
      console.log("[useCharacterSession] Locking character...");
      setLockLoading(true);
      setScriptProgress(60);
      const lockResult = await characterApi.lockCharacter(newSession.id);
      console.log("[useCharacterSession] Character locked:", lockResult);
      setLockedImage(lockResult.lockedUrl || lockResult.lockedImageUrl || lockResult.imageUrl);
      setLockLoading(false);
      setScriptProgress(100);

      // Move to step 1 (character lock review)
      setDirection(1);
      setStep(1);
      toast.success("Character processed! Review the generated version.");
    } catch (err) {
      console.error("[useCharacterSession] Failed to start session:", err);
      setSession(null);
      setSessionId(null);
      setScriptProgress(0);
      setLockLoading(false);
      setDirection(-1);
      setStep(0);
      setError(err.message);
      if (err.response?.status === 402) {
        toast.error("Insufficient credits");
        navigate("/buy-credits");
      } else {
        toast.error(err.response?.data?.error || "Failed to start character session");
      }
    } finally {
      setLoading(false);
    }
  }, [userPrompt, style, voiceId, character, navigate]);

  // ── Regenerate lock ─────────────────────────────────────────────────
  const regenerateLock = useCallback(async (feedback) => {
    if (!sessionId) return;
    if (lockRegenerateCount >= 3) {
      toast.error("Maximum regeneration attempts reached (3)");
      return;
    }

    setLockLoading(true);
    try {
      console.log("[useCharacterSession] Regenerating lock with feedback:", feedback);
      const lockResult = await characterApi.lockCharacter(sessionId, { feedback });
      setLockedImage(lockResult.lockedUrl || lockResult.lockedImageUrl || lockResult.imageUrl);
      setLockRegenerateCount((prev) => prev + 1);
      toast.success("Character regenerated!");
    } catch (err) {
      console.error("[useCharacterSession] Failed to regenerate lock:", err);
      toast.error("Failed to regenerate character");
    } finally {
      setLockLoading(false);
    }
  }, [sessionId, lockRegenerateCount]);

  // ── Approve lock ────────────────────────────────────────────────────
  const approveLock = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      console.log("[useCharacterSession] Approving character...");
      await characterApi.approveCharacter(sessionId);
      setCharacterApproved(true);

      // Generate script after approval
      console.log("[useCharacterSession] Generating script...");
      const sessionAfterScript = await sessionService.generateScript(sessionId);
      console.log("[useCharacterSession] Script generated:", sessionAfterScript);
      console.log("[useCharacterSession] scriptData:", sessionAfterScript.scriptData);
      console.log("[useCharacterSession] scriptData.sections:", sessionAfterScript.scriptData?.sections);
      console.log("[useCharacterSession] scriptData keys:", sessionAfterScript.scriptData ? Object.keys(sessionAfterScript.scriptData) : "null");
      console.log("[useCharacterSession] sections count:", sessionAfterScript.scriptData?.sections?.length);
      setSession(sessionAfterScript);
      setScriptData(sessionAfterScript.scriptData);

      setDirection(1);
      setStep(2);
      toast.success("Character approved! Review your script.");
    } catch (err) {
      console.error("[useCharacterSession] Failed to approve lock:", err);
      if (err.response?.status === 402) {
        toast.error("Insufficient credits");
        navigate("/buy-credits");
      } else {
        toast.error(err.response?.data?.error || "Failed to approve character");
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  // ── Generate scene frames ───────────────────────────────────────────
  const generateFrames = useCallback(async () => {
    if (!sessionId) return;

    setFramesLoading(true);
    try {
      console.log("[useCharacterSession] Generating scene frames...");
      const result = await characterApi.generateSceneFrames(sessionId);
      console.log("[useCharacterSession] Scene frames generated:", result);
      setSceneFrames(result.sceneFrames || result.frames || result);
      toast.success("Scene frames generated!");
    } catch (err) {
      console.error("[useCharacterSession] Failed to generate frames:", err);
      if (err.response?.status === 402) {
        toast.error("Insufficient credits");
        navigate("/buy-credits");
      } else {
        toast.error(err.response?.data?.error || "Failed to generate scene frames");
      }
    } finally {
      setFramesLoading(false);
    }
  }, [sessionId, navigate]);

  // ── Regenerate a single frame ───────────────────────────────────────
  const regenerateFrame = useCallback(async (index, feedback) => {
    if (!sessionId) return;

    setFramesLoading(true);
    try {
      console.log("[useCharacterSession] Regenerating frame", index, "with feedback:", feedback);
      const result = await characterApi.regenerateSceneFrame(sessionId, index, { feedback });
      setSceneFrames((prev) => {
        const updated = [...prev];
        updated[index] = result.frame || result;
        return updated;
      });
      toast.success("Frame regenerated!");
    } catch (err) {
      console.error("[useCharacterSession] Failed to regenerate frame:", err);
      toast.error("Failed to regenerate frame");
    } finally {
      setFramesLoading(false);
    }
  }, [sessionId]);

  // ── Approve frames ─────────────────────────────────────────────────
  const approveFrames = useCallback(() => {
    setDirection(1);
    setStep(4);
  }, []);

  // ── Delete a scene ──────────────────────────────────────────────────
  const deleteScene = useCallback((index) => {
    if (sceneFrames.length <= 2) {
      toast.error("Cannot delete — minimum 2 scenes required");
      return;
    }

    setSceneFrames((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated;
    });
    setScriptData((prev) => {
      if (!prev?.sections) return prev;
      const updatedSections = prev.sections.filter((_, i) => i !== index);
      // Re-index sections
      const reindexed = updatedSections.map((section, i) => ({
        ...section,
        index: i,
      }));
      return { ...prev, sections: reindexed };
    });
    toast.success("Scene deleted");
  }, [sceneFrames.length]);

  // ── Reorder scenes ──────────────────────────────────────────────────
  const reorderScenes = useCallback((newOrder) => {
    // newOrder is an array of new indices, e.g. [2, 0, 1]
    // Capture originals before remapping
    setSceneFrames((prev) => {
      return newOrder.map((originalIndex) => prev[originalIndex]);
    });
    setScriptData((prev) => {
      if (!prev?.sections) return prev;
      const reorderedSections = newOrder.map((originalIndex, newIndex) => ({
        ...prev.sections[originalIndex],
        index: newIndex,
      }));
      return { ...prev, sections: reorderedSections };
    });
  }, []);

  // ── Start generation (character pipeline wrapper) ───────────────────
  const startGeneration = useCallback(async () => {
    console.log("[useCharacterSession] startGeneration called");

    if (!sessionId) return;

    // Transition to GeneratingStep (step 5) immediately
    setDirection(1);
    setStep(5);

    const result = await baseStartGeneration({
      videoModel,
      voiceId,
      backgroundMusic,
    });

    if (result && !result.success) {
      if (result.reason === "insufficient_credits") {
        setDirection(-1);
        setStep(4);
      } else if (result.reason === "network_error") {
        // Stay on step 5, let polling pick up
      } else {
        setDirection(-1);
        setStep(4);
      }
    }
  }, [sessionId, videoModel, voiceId, backgroundMusic, baseStartGeneration]);

  // ── Navigation ──────────────────────────────────────────────────────
  const goToStep = useCallback((newStep) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  }, [step]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setStep((prev) => prev + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setStep((prev) => Math.max(0, prev - 1));
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    // Cleanup preview URL
    if (character.referenceImage) {
      URL.revokeObjectURL(character.referenceImage);
    }

    resetBase();

    setStep(0);
    setCharacter({ name: "", description: "", referenceImage: null, referenceFile: null, useUpload: true });
    setLockedImage(null);
    setCharacterApproved(false);
    setSceneFrames([]);
    setLockLoading(false);
    setFramesLoading(false);
    setLockRegenerateCount(0);
  }, [character.referenceImage, resetBase]);

  return {
    // Spread all base shared state & callbacks
    ...base,

    // Pipeline identifier
    pipelineMode: "character",

    // Override step
    step,
    direction: base.direction,
    loading: base.loading,
    error: base.error,

    // Character-specific state
    character,
    setCharacter,
    lockedImage,
    characterApproved,
    sceneFrames,
    setSceneFrames,
    lockLoading,
    framesLoading,
    lockRegenerateCount,

    // Character-specific actions
    startCharacterSession,
    regenerateLock,
    approveLock,
    generateFrames,
    regenerateFrame,
    approveFrames,
    deleteScene,
    reorderScenes,

    // Generation (override base with pipeline-specific wrapper)
    startGeneration,
    scriptProgress: base.scriptProgress,
    generationProgress: base.generationProgress,
    finalVideoUrl: base.finalVideoUrl,
    insufficientCredits: base.insufficientCredits,
    dismissInsufficientCredits: base.dismissInsufficientCredits,

    // Shared actions from base
    editScriptWithAI: base.editScriptWithAI,
    approveScript: base.approveScript,
    updateScript: base.updateScript,
    updateClip: base.updateClip,
    regenerateClip: base.regenerateClip,
    regenerateNarration: base.regenerateNarration,
    reorderClips: base.reorderClips,
    reassembleVideo: base.reassembleVideo,
    deleteClip: base.deleteClip,
    enterEditingMode: base.enterEditingMode,
    completeSession: base.completeSession,
    refreshSession: base.refreshSession,

    // Navigation
    goToStep,
    handleNext,
    handlePrev,
    reset,

    // Constants
    STYLE_OPTIONS,
    STAGES,
    CHAR_STAGE_TO_STEP,
  };
}
