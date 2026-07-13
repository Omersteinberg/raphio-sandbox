import { useState, useCallback, useEffect } from "react";
import { toast } from "@/lib/toast";
import * as sessionService from "@/services/session";
import { useSessionBase, STAGES } from "./useSessionBase";
import { getCreationDefaults } from "@/lib/preferences";
import { isProviderUnavailable } from "@/lib/errorDetail";

// Map backend intro-pipeline stages to frontend step numbers.
const INTRO_STAGE_TO_STEP = {
  INTRO_BRIEF: 0,
  INTRO_SCRIPT_GENERATED: 1,
  INTRO_SCRIPT_APPROVED: 1,
  GENERATING: 2,
  COMPLETED: 3,
};

const EMPTY_SCRIPT = { businessName: "", vignettes: [], motionPrompt: "", musicPrompt: "", narration: "" };

function scriptFromIntroData(introData) {
  if (!introData) return null;
  if (!introData.motionPrompt) return null;
  return {
    businessName: introData.businessName || "",
    vignettes: Array.isArray(introData.vignettes) ? introData.vignettes : [],
    motionPrompt: introData.motionPrompt || "",
    musicPrompt: introData.musicPrompt || "",
    narration: typeof introData.narration === "string" ? introData.narration : "",
  };
}

export function useIntroSession() {
  const [step, setStep] = useState(0);

  const base = useSessionBase({ generatingStep: 2, currentStep: step });
  const {
    sessionId, setSessionId, session, setSession,
    setDirection, setLoading, setError,
    voiceId, setVoiceId,
    aspectRatio, setAspectRatio,
    setScriptProgress, setFinalVideoUrl,
    navigate, credits,
    setProviderUnavailable,
    startGeneration: baseStartGeneration,
    resetBase,
  } = base;

  // Brief state
  const [logoFile, setLogoFile] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [style, setStyle] = useState("cinematic");
  // aspectRatio comes from useSessionBase (shared saved default + auto-save);
  // style stays intro-specific ("cinematic") and is intentionally not persisted.
  const [showcaseFiles, setShowcaseFiles] = useState([]);

  // Script state
  const [introScript, setIntroScript] = useState(EMPTY_SCRIPT);
  const [editRequest, setEditRequest] = useState("");

  const updateScriptField = useCallback((field, value) => {
    setIntroScript((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Sync step + local script with session stage
  useEffect(() => {
    if (!session?.stage) return;
    const newStep = INTRO_STAGE_TO_STEP[session.stage] ?? 0;
    if (newStep !== step) {
      setDirection(newStep > step ? 1 : -1);
      setStep(newStep);
    }
    const s = scriptFromIntroData(session.introData);
    if (s) setIntroScript(s);
    if (session.voiceId) setVoiceId(session.voiceId);
    if (session.video?.finalVideoUrl) setFinalVideoUrl(session.video.finalVideoUrl);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Brief → create session + generate first script draft
  const startIntroSession = useCallback(async () => {
    if (!logoFile) { toast.error("Please upload a logo"); return; }
    if (!description.trim()) { toast.error("Please describe what your business does"); return; }
    if (credits != null && credits < 1) {
      toast.info("You need at least 1 credit to generate an intro.");
      navigate("/buy-credits");
      return;
    }

    setLoading(true);
    setError(null);
    setProviderUnavailable(null);
    setScriptProgress(1);
    try {
      setScriptProgress(8);
      const created = await sessionService.startSession({
        userPrompt: description || businessName,
        pipelineMode: "intro",
        style,
        voiceId,
        aspectRatio,
      });
      setSessionId(created.id);
      setSession(created);
      setScriptProgress(20);

      await sessionService.uploadLogo(created.id, logoFile);
      setScriptProgress(40);

      if (showcaseFiles.length > 0) {
        await sessionService.uploadImages(created.id, showcaseFiles);
      }
      setScriptProgress(55);

      await sessionService.saveIntroBrief(created.id, { businessName, description, targetAudience, style });
      setScriptProgress(70);

      const withScript = await sessionService.generateIntroScript(created.id);
      setSession(withScript);
      const s = scriptFromIntroData(withScript.introData);
      if (s) setIntroScript(s);
      setScriptProgress(100);

      setDirection(1);
      setStep(1);
      toast.success("Intro script ready! Review and approve.");
    } catch (err) {
      console.error("[useIntroSession] startIntroSession failed:", err);
      setSession(null);
      setSessionId(null);
      setScriptProgress(0);
      setDirection(-1);
      setStep(0);
      setError(err.response?.data?.error || err.message);
      if (isProviderUnavailable(err)) {
        setProviderUnavailable({ message: err.response.data.error });
      } else if (err.response?.status === 402) {
        toast.info("You need at least 1 credit to generate an intro.");
        navigate("/buy-credits");
      } else {
        toast.error(err.response?.data?.error || "Failed to start intro");
      }
    } finally {
      setLoading(false);
    }
  }, [logoFile, businessName, description, targetAudience, style, voiceId, aspectRatio, showcaseFiles, credits, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save current local edits to the backend
  const saveScriptEdits = useCallback(async () => {
    if (!sessionId) return null;
    const updated = await sessionService.updateIntroScript(sessionId, { ...introScript, voiceId });
    setSession(updated);
    return updated;
  }, [sessionId, introScript, voiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate the whole script (optionally with an AI edit request)
  const regenerateScript = useCallback(async (request) => {
    if (!sessionId) return;
    setLoading(true);
    setScriptProgress(10);
    try {
      await sessionService.updateIntroScript(sessionId, { ...introScript, voiceId });
      setScriptProgress(40);
      const updated = await sessionService.generateIntroScript(sessionId, { editRequest: request || undefined });
      setSession(updated);
      const s = scriptFromIntroData(updated.introData);
      if (s) setIntroScript(s);
      setEditRequest("");
      setScriptProgress(100);
      toast.success(request ? "Script updated!" : "Script regenerated!");
    } catch (err) {
      setScriptProgress(0);
      toast.error(err.response?.data?.error || "Failed to update script");
    } finally {
      setLoading(false);
    }
  }, [sessionId, introScript, voiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const editScriptWithAI = useCallback(async () => {
    if (!editRequest.trim()) return;
    await regenerateScript(editRequest.trim());
  }, [editRequest, regenerateScript]);

  // Approve + generate
  const approveAndGenerate = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await sessionService.updateIntroScript(sessionId, { ...introScript, voiceId });
      await sessionService.approveScript(sessionId);
    } catch (err) {
      setLoading(false);
      toast.error(err.response?.data?.error || "Failed to approve script");
      return;
    }
    setLoading(false);

    setDirection(1);
    setStep(2);
    // Intro's design default model is VEO. baseStartGeneration would otherwise
    // fall back to KLING, so pass it explicitly.
    const result = await baseStartGeneration({ voiceId, videoModel: "VEO" });
    if (result && !result.success) {
      setDirection(-1);
      setStep(1);
    }
  }, [sessionId, introScript, voiceId, baseStartGeneration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation
  const goToStep = useCallback((newStep) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setStep((prev) => Math.max(0, prev - 1));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    resetBase();
    setStep(0);
    setLogoFile(null);
    setBusinessName("");
    setDescription("");
    setTargetAudience("");
    setStyle("cinematic");
    setAspectRatio(getCreationDefaults().aspectRatio);
    setShowcaseFiles([]);
    setIntroScript(EMPTY_SCRIPT);
    setEditRequest("");
  }, [resetBase]);

  return {
    ...base,
    pipelineMode: "intro",
    step,
    direction: base.direction,
    loading: base.loading,
    error: base.error,

    // Brief
    logoFile, setLogoFile,
    businessName, setBusinessName,
    description, setDescription,
    targetAudience, setTargetAudience,
    style, setStyle,
    aspectRatio, setAspectRatio,
    showcaseFiles, setShowcaseFiles,

    // Script
    introScript, setIntroScript, updateScriptField,
    editRequest, setEditRequest,
    voiceId, setVoiceId,
    scriptProgress: base.scriptProgress,

    // Actions
    startIntroSession,
    saveScriptEdits,
    regenerateScript,
    editScriptWithAI,
    approveAndGenerate,

    // Navigation
    goToStep,
    handlePrev,
    reset,

    STAGES,
  };
}
