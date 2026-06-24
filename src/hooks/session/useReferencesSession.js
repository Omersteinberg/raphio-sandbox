import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import * as sessionService from "@/services/session";
import * as referenceApi from "@/services/reference";
import { useSessionBase, STAGES } from "./useSessionBase";
import { STYLE_OPTIONS } from "../../constants/styles";
import { CREDITS_PER_CLIP } from "@/lib/limits";
import { savePending, clearPending } from "@/lib/pendingSession";

// Map backend references-pipeline stages to frontend step numbers
const REF_STAGE_TO_STEP = {
  REF_PROMPT_ENTERED: 0,
  REF_REFERENCES_ADDED: 1,
  REF_REFERENCES_LOCKED: 1,
  REF_SCRIPT_GENERATED: 2,
  REF_SCRIPT_APPROVED: 3,
  REF_FRAMES_GENERATED: 3,
  REF_FRAMES_APPROVED: 3,
  REF_VOICE_CONFIGURED: 4,
  GENERATING: 5,
  COMPLETED: 6,
  EDITING: 7,
  // Fallbacks
  SCRIPT_GENERATED: 2,
  SCRIPT_APPROVED: 2,
};

export function useReferencesSession() {
  const [step, setStep] = useState(0);
  const onSessionLoadedRef = useRef(null);

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
    userPrompt, style, targetDuration, voiceId, videoModel, backgroundMusic, aspectRatio,
    scriptData, setScriptData,
    setScriptProgress,
    setInsufficientCredits,
    setFinalVideoUrl,
    navigate, credits, refreshCredits,
    startGeneration: baseStartGeneration,
    resetBase,
  } = base;

  // ── References-specific state ──────────────────────────────────────
  const [references, setReferences] = useState([]);
  const [referenceData, setReferenceData] = useState(null);
  const [sceneFrames, setSceneFrames] = useState([]);
  const [lockLoading, setLockLoading] = useState(new Set());
  const [framesLoading, setFramesLoading] = useState(false);

  // ── Restore state when resuming ────────────────────────────────────
  onSessionLoadedRef.current = (data) => {
    if (data.referenceData) {
      setReferenceData(data.referenceData);
      const allRefs = [
        ...(data.referenceData.characters || []).map(r => ({ ...r, type: r.type || 'character' })),
        ...(data.referenceData.settings || []).map(r => ({ ...r, type: r.type || 'setting' })),
        ...(data.referenceData.logos || []).map(r => ({ ...r, type: r.type || 'logo' })),
      ];
      setReferences(allRefs);
    }
    if (data.sceneFrames?.length) {
      setSceneFrames(data.sceneFrames);
    }
  };

  // ── Sync step with session stage ───────────────────────────────────
  useEffect(() => {
    if (session?.stage) {
      const newStep = REF_STAGE_TO_STEP[session.stage] ?? 0;
      console.log("[useReferencesSession] Stage sync:", session.stage, "-> step", newStep);

      if (newStep !== step) {
        setDirection(newStep > step ? 1 : -1);
        setStep(newStep);
      }

      if (session.referenceData) {
        setReferenceData(session.referenceData);
        const allRefs = [
          ...(session.referenceData.characters || []).map(r => ({ ...r, type: r.type || 'character' })),
          ...(session.referenceData.settings || []).map(r => ({ ...r, type: r.type || 'setting' })),
          ...(session.referenceData.logos || []).map(r => ({ ...r, type: r.type || 'logo' })),
        ];
        setReferences(allRefs);
      }
      if (session.scriptData) {
        setScriptData(session.scriptData);
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

  // ── Persist draft while on step 0 (before session starts) ─────────
  useEffect(() => {
    if (sessionId || step !== 0) return;

    const refsArray = Array.isArray(references) ? references : [];
    const hasDraft = Boolean(userPrompt?.trim()) ||
      refsArray.some(r => r.name?.trim());

    if (!hasDraft) return;

    savePending("references", {
      userPrompt,
      style,
      references: refsArray.map(r => ({
        type: r.type || 'character',
        name: r.name,
        description: r.description,
        useUpload: r.useUpload,
      })),
    }).catch(console.warn);

  }, [userPrompt, style, references, sessionId, step]);

  // ── Start references session ───────────────────────────────────────
  const startReferencesSession = useCallback(async () => {
    console.log("[useReferencesSession] startReferencesSession called");

    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Validate at least one reference with name and description
    const validRefs = references.filter(r => r.name.trim() && r.description.trim());
    if (validRefs.length === 0) {
      toast.error("Please add at least one reference with name and description");
      return;
    }

    // Validate all named references have descriptions
    for (const ref of references) {
      if (ref.name.trim() && !ref.description.trim()) {
        toast.error(`Please add a description for ${ref.name}`);
        return;
      }
    }

    if (credits != null && credits < CREDITS_PER_CLIP) {
      toast.info(`You need at least ${CREDITS_PER_CLIP} credits per clip to generate a video.`);
      navigate("/buy-credits");
      return;
    }

    setLoading(true);
    setError(null);
    setScriptProgress(0);

    try {
      // Step 1: Create the session
      console.log("[useReferencesSession] Creating session...");
      setScriptProgress(5);
      const newSession = await sessionService.startSession({
        userPrompt,
        style,
        pipelineMode: "references",
        voiceId,
        imageDuration: 5,
        targetDuration,
        aspectRatio,
      });
      setScriptProgress(10);
      setSessionId(newSession.id);
      setSession(newSession);
      try { await clearPending("references"); } catch (e) { console.warn(e); }

      // Step 2: Add all references
      const totalRefs = validRefs.length;
      let refsDone = 0;

      const collectionMap = { character: 'characters', setting: 'settings', logo: 'logos', product: 'characters' };

      for (const ref of validRefs) {
        console.log(`[useReferencesSession] Adding ${ref.type}: ${ref.name}`);
        const descSuffix = ref.type === 'character' ? '. Do not generate any background, use a plain solid color background only.' : '';
        await referenceApi.addReference(newSession.id, {
          type: ref.type,
          name: ref.name,
          description: `${ref.description}${descSuffix}`,
          imageFile: ref.useUpload ? ref.referenceFile : null,
        });

        // Logos are auto-locked, no AI generation needed. For others, generate if no file uploaded.
        if (ref.type !== 'logo' && (!ref.useUpload || !ref.referenceFile)) {
          const refreshed = await sessionService.getSession(newSession.id);
          const refData = refreshed.referenceData;
          const collection = refData[collectionMap[ref.type]] || [];
          const lastRef = collection[collection.length - 1];
          if (lastRef && !lastRef.originalUrl) {
            await referenceApi.generateReferenceImage(newSession.id, lastRef.id);
          }
        }

        refsDone++;
        setScriptProgress(10 + Math.round((refsDone / totalRefs) * 40));
      }

      // Step 3: Restyle references
      console.log("[useReferencesSession] Restyling references...");
      setScriptProgress(55);
      setLockLoading(new Set(['__all__']));
      await referenceApi.restyleReferences(newSession.id);
      setScriptProgress(90);

      // Refresh session to get updated reference data
      const updatedSession = await sessionService.getSession(newSession.id);
      setSession(updatedSession);
      setReferenceData(updatedSession.referenceData);
      setScriptProgress(100);
      setLockLoading(new Set());

      // Move to step 1 (reference lock review)
      setDirection(1);
      setStep(1);
      toast.success("References processed! Review and approve.");
    } catch (err) {
      console.error("[useReferencesSession] Failed to start session:", err);
      setSession(null);
      setSessionId(null);
      setScriptProgress(0);
      setLockLoading(new Set());
      setDirection(-1);
      setStep(0);
      setError(err.message);
      if (err.response?.status === 402) {
        toast.info(`You need at least ${CREDITS_PER_CLIP} credits per clip to generate a video.`);
        navigate("/buy-credits");
      } else {
        toast.error(err.response?.data?.error || "Failed to start references session");
      }
    } finally {
      setLoading(false);
    }
  }, [userPrompt, style, voiceId, references, navigate, credits, aspectRatio]);

  // ── Approve all references ─────────────────────────────────────────
  const approveAllReferences = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setScriptProgress(0);

    // Simulated climb so the rich loader's sub-steps/bar advance during the
    // (~5 min) script generation, which reports no granular progress.
    const progressTimer = setInterval(() => {
      setScriptProgress((prev) => (prev >= 90 ? prev : prev + (90 - prev) * 0.04));
    }, 600);

    try {
      console.log("[useReferencesSession] Approving all references...");
      await referenceApi.approveAllReferences(sessionId);
      setScriptProgress((prev) => Math.max(prev, 30));

      // Generate script after approval
      console.log("[useReferencesSession] Generating script...");
      const sessionAfterScript = await sessionService.generateScript(sessionId);
      setSession(sessionAfterScript);
      setScriptData(sessionAfterScript.scriptData);
      setScriptProgress(100);

      setDirection(1);
      setStep(2);
      toast.success("References approved! Review your script.");
    } catch (err) {
      console.error("[useReferencesSession] Failed to approve references:", err);
      setScriptProgress(0);
      if (err.response?.status === 402) {
        toast.error("Insufficient credits");
        navigate("/buy-credits");
      } else {
        toast.error(err.response?.data?.error || "Failed to approve references");
      }
    } finally {
      clearInterval(progressTimer);
      setLoading(false);
    }
  }, [sessionId, navigate, setScriptProgress]);

  // ── Approve script (override base to explicitly advance step) ──────
  const approveScript = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      if (base.scriptData) {
        await sessionService.updateScript(sessionId, { scriptData: base.scriptData });
      }

      const updatedSession = await sessionService.approveScript(sessionId);
      setSession(updatedSession);

      setDirection(1);
      setStep(3);
      toast.success("Script approved!");
    } catch (err) {
      console.error("[useReferencesSession] approveScript failed:", err);
      toast.error("Failed to approve script");
    } finally {
      setLoading(false);
    }
  }, [sessionId, base.scriptData]);

  // ── Regenerate a single reference ──────────────────────────────────
  const regenerateReference = useCallback(async (refId, feedback) => {
    if (!sessionId) return;

    setLockLoading(prev => new Set([...prev, refId]));
    try {
      console.log("[useReferencesSession] Regenerating reference:", refId);
      await referenceApi.regenerateReference(sessionId, refId, { feedback });

      const refreshed = await sessionService.getSession(sessionId);
      setSession(refreshed);
      setReferenceData(refreshed.referenceData);
      toast.success("Reference regenerated!");
    } catch (err) {
      console.error("[useReferencesSession] Failed to regenerate reference:", err);
      toast.error("Failed to regenerate reference");
    } finally {
      setLockLoading(prev => {
        const next = new Set(prev);
        next.delete(refId);
        return next;
      });
    }
  }, [sessionId]);

  // ── Generate scene frames ──────────────────────────────────────────
  const generateFrames = useCallback(async () => {
    if (!sessionId) return;

    setFramesLoading(true);
    try {
      console.log("[useReferencesSession] Generating scene frames...");
      const result = await referenceApi.generateSceneFrames(sessionId);
      setSceneFrames(result.sceneFrames || result.frames || result);
      toast.success("Scene frames generated!");
    } catch (err) {
      console.error("[useReferencesSession] Failed to generate frames:", err);
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

  // ── Regenerate a single frame ──────────────────────────────────────
  const regenerateFrame = useCallback(async (index, feedback) => {
    if (!sessionId) return;

    setFramesLoading(true);
    try {
      const result = await referenceApi.regenerateSceneFrame(sessionId, index, { feedback });
      setSceneFrames((prev) => {
        const updated = [...prev];
        updated[index] = result.frame || result;
        return updated;
      });
      toast.success("Frame regenerated!");
    } catch (err) {
      console.error("[useReferencesSession] Failed to regenerate frame:", err);
      toast.error("Failed to regenerate frame");
    } finally {
      setFramesLoading(false);
    }
  }, [sessionId]);

  // ── Approve frames ────────────────────────────────────────────────
  const approveFrames = useCallback(() => {
    setDirection(1);
    setStep(4);
  }, []);

  // ── Delete a scene ─────────────────────────────────────────────────
  const deleteScene = useCallback((index) => {
    if (sceneFrames.length <= 2) {
      toast.error("Cannot delete — minimum 2 scenes required");
      return;
    }
    setSceneFrames((prev) => prev.filter((_, i) => i !== index));
    setScriptData((prev) => {
      if (!prev?.sections) return prev;
      const updatedSections = prev.sections.filter((_, i) => i !== index)
        .map((section, i) => ({ ...section, index: i }));
      return { ...prev, sections: updatedSections };
    });
    toast.success("Scene deleted");
  }, [sceneFrames.length]);

  // ── Reorder scenes ─────────────────────────────────────────────────
  const reorderScenes = useCallback((newOrder) => {
    setSceneFrames((prev) => newOrder.map((originalIndex) => prev[originalIndex]));
    setScriptData((prev) => {
      if (!prev?.sections) return prev;
      const reorderedSections = newOrder.map((originalIndex, newIndex) => ({
        ...prev.sections[originalIndex],
        index: newIndex,
      }));
      return { ...prev, sections: reorderedSections };
    });
  }, []);

  // ── Start generation ───────────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    if (!sessionId) return;

    setDirection(1);
    setStep(5);

    const result = await baseStartGeneration({
      videoModel,
      voiceId,
      backgroundMusic,
    });

    if (result && !result.success) {
      setDirection(-1);
      setStep(4);
    }
  }, [sessionId, videoModel, voiceId, backgroundMusic, baseStartGeneration]);

  // ── Navigation ─────────────────────────────────────────────────────
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

  // ── Reset ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    resetBase();
    setStep(0);
    setReferences([]);
    setReferenceData(null);
    setSceneFrames([]);
    setLockLoading(new Set());
    setFramesLoading(false);
  }, [resetBase]);

  return {
    ...base,

    pipelineMode: "references",

    step,
    direction: base.direction,
    loading: base.loading,
    error: base.error,

    // References-specific state
    references,
    setReferences,
    referenceData,
    sceneFrames,
    setSceneFrames,
    lockLoading,
    framesLoading,

    // References-specific actions
    startReferencesSession,
    approveAllReferences,
    regenerateReference,
    generateFrames,
    regenerateFrame,
    approveFrames,
    deleteScene,
    reorderScenes,

    // Generation
    startGeneration,
    scriptProgress: base.scriptProgress,
    generationProgress: base.generationProgress,
    finalVideoUrl: base.finalVideoUrl,
    insufficientCredits: base.insufficientCredits,
    dismissInsufficientCredits: base.dismissInsufficientCredits,

    // Shared actions from base
    editScriptWithAI: base.editScriptWithAI,
    approveScript,
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
    REF_STAGE_TO_STEP,
  };
}
