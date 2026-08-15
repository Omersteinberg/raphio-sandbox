import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import * as sessionService from "@/services/session";
import { useSessionBase, STAGES } from "./useSessionBase";
import { getCreationDefaults } from "@/lib/preferences";
import { DEFAULT_INTRO_DURATION } from "@/constants/introDurations";
import { describeError, isProviderUnavailable } from "@/lib/errorDetail";
import { isGenerationFailed } from "@/lib/progressTasks";
import { extractLogoColors } from "@/lib/logoColors";
import { dataUrlToFile } from "@/lib/dataUrlToFile";
import { DEFAULT_BRAND_FONTS } from "@/constants/brandFonts";

const GENERATING_STEP = 2;

// Map backend intro-pipeline stages to frontend step numbers.
const INTRO_STAGE_TO_STEP = {
  INTRO_BRIEF: 0,
  INTRO_SCRIPT_GENERATED: 1,
  INTRO_SCRIPT_APPROVED: 1,
  GENERATING: 2,
  COMPLETED: 3,
};

const EMPTY_SCRIPT = { businessName: "", scenes: [], musicPrompt: "", narration: "" };

// Scene creation is a single spinner from the user's side and several minutes of
// work underneath, so when someone reports that it hung, the console is the only
// record of which call it hung in. Every line is tagged and carries its own
// elapsed time.
const log = (msg) => console.log(`[intro] ${msg}`);
const since = (t) => `${((Date.now() - t) / 1000).toFixed(1)}s`;

function scriptFromIntroData(introData) {
  if (!introData) return null;
  if (!Array.isArray(introData.scenes) || !introData.scenes.length) return null;
  return {
    businessName: introData.businessName || "",
    // Each scene carries its own rendered clip (clipUrl) and the still that stands
    // in until the clip exists. There is no separate "script ready" pass any more:
    // the scenes are the script.
    scenes: introData.scenes,
    sceneFrames: Array.isArray(introData.sceneFrames) ? introData.sceneFrames : [],
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
    generationError, setGenerationError,
    startGeneration: baseStartGeneration,
    resetBase,
  } = base;

  // Brief state
  const [logoFile, setLogoFile] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  // No separate audience field any more: the brief is one prompt, and who it is
  // for belongs in the same sentence as what you do. The API still accepts
  // targetAudience for anything else that posts a brief.
  const [targetDuration, setTargetDuration] = useState(DEFAULT_INTRO_DURATION);
  // aspectRatio comes from useSessionBase (shared saved default + auto-save).
  // Length is deliberately NOT taken from there: the base default is shared with
  // the main pipeline, whose picker runs 15/30/45/60, so a user coming off a 60s
  // video would land the intro on a length it does not offer. Intro-local and
  // unpersisted, the same reasoning the visual style picker used before it was
  // removed (the intro renders motion graphics from the brand kit, so a style
  // pick had nothing to act on).
  const [showcaseFiles, setShowcaseFiles] = useState([]);
  // Names for the uploads, held parallel to the files. They become
  // WizardImage.label at upload, which is what an "@dashboard" in the brief binds
  // to when the model picks an imageIndex.
  const [showcaseLabels, setShowcaseLabels] = useState([]);

  // Brand colours for the Remotion stinger. Auto-derived from the logo on upload,
  // but once the user edits a swatch we stop overwriting their choice.
  const [brandColors, setBrandColors] = useState(null);
  // Heading and body families from the curated list, and how the brand presents.
  // Both only arrive from a website import, there is no way to read them off a
  // logo image, so they stay null until one happens or the user picks.
  const [brandFonts, setBrandFonts] = useState(null);
  const [brandTone, setBrandTone] = useState(null);
  const brandTouchedRef = useRef(false);
  const setBrandColor = useCallback((key, value) => {
    brandTouchedRef.current = true;
    setBrandColors((prev) => ({ ...(prev || {}), [key]: value }));
  }, []);
  const setBrandFont = useCallback((which, family) => {
    brandTouchedRef.current = true;
    setBrandFonts((prev) => ({ ...(prev || DEFAULT_BRAND_FONTS), [which]: family }));
  }, []);
  useEffect(() => {
    if (!logoFile || brandTouchedRef.current) return;
    let cancelled = false;
    extractLogoColors(logoFile).then((colors) => {
      if (!cancelled && colors && !brandTouchedRef.current) setBrandColors(colors);
    });
    return () => { cancelled = true; };
  }, [logoFile]);

  /**
   * Fill the brief from a website import.
   *
   * Only writes fields that are still empty, so pasting a URL after typing never
   * destroys what was typed. Colours and fonts additionally respect
   * brandTouchedRef, the same guard that stops logo-derived colours overwriting a
   * manual edit: once someone has adjusted the kit by hand, their choice wins.
   */
  const applyExtractedBrand = useCallback((found) => {
    if (!found) return;

    if (found.businessName) setBusinessName((cur) => (cur.trim() ? cur : found.businessName));
    if (found.description) setDescription((cur) => (cur.trim() ? cur : found.description));

    if (found.logo?.dataUrl) {
      const file = dataUrlToFile(found.logo.dataUrl, "website-logo.png");
      if (file) setLogoFile((cur) => cur || file);
    }

    if (!brandTouchedRef.current) {
      if (found.brandColors) {
        setBrandColors(found.brandColors);
        // The server read these off the real site, which beats the client's
        // guess from the logo's pixels. Claim the kit so the logo-derived effect
        // above does not race in behind us and overwrite them.
        brandTouchedRef.current = true;
      }
      if (found.fonts) setBrandFonts(found.fonts);
    }

    // Tone has no manual control and no other source, so there is nothing for it
    // to clobber.
    if (found.tone) setBrandTone(found.tone);
  }, []);

  // Review state
  const [introScript, setIntroScript] = useState(EMPTY_SCRIPT);
  // Which scenes are being reworked right now. One job slot per session means a
  // batch is one job, so this is the set of indices in flight rather than a queue.
  const [reworkingIndexes, setReworkingIndexes] = useState([]);
  // What the running rework says it is doing ("Rendering scene 3 of 7").
  const [reworkLabel, setReworkLabel] = useState("");
  // What the running job says it is doing ("Rendering scene 3 of 7").
  const [scriptLabel, setScriptLabel] = useState("");

  const updateScriptField = useCallback((field, value) => {
    setIntroScript((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Sync step + local script with session stage
  useEffect(() => {
    if (!session?.stage) return;
    // Resume/refresh after a failed render: the backend rolled the stage back to
    // INTRO_SCRIPT_APPROVED but flagged the Video FAILED. Pin to the generating
    // step so the failure screen + Regenerate shows, instead of silently dropping
    // the user back to the script step. Mirrors useSession's stage-sync guard.
    const genFailed = isGenerationFailed(session) && session.stage !== "GENERATING";
    if (genFailed && !generationError) {
      setGenerationError(session.video?.progressData?.error || "Video generation failed. Please try again.");
    }
    const newStep = genFailed ? GENERATING_STEP : (INTRO_STAGE_TO_STEP[session.stage] ?? 0);
    if (newStep !== step) {
      setDirection(newStep > step ? 1 : -1);
      setStep(newStep);
    }
    const s = scriptFromIntroData(session.introData);
    if (s) setIntroScript(s);
    if (session.voiceId) setVoiceId(session.voiceId);
    if (session.video?.finalVideoUrl) setFinalVideoUrl(session.video.finalVideoUrl);
  }, [session, generationError]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // The ticks below run 2 -> 20 and then hand the bar to the job, whose own
    // 0-100 is mapped onto 20-100. They used to run as far as 55 and then reset to
    // 20 when the job started, which read as the bar going backwards, and they are
    // what INTRO_SUB_STEPS in IntroPipelineCreator draws its ranges from.
    setScriptProgress(2);

    const startedAt = Date.now();
    // What was asked for, so a console left open through a failed run still says
    // what the run was.
    log(`creating scenes: ${targetDuration}s, ${aspectRatio}, logo "${logoFile.name}", ${showcaseFiles.length} photo(s), brief ${description.trim().split(/\s+/).filter(Boolean).length} words`);
    let phase = "starting the session";
    try {
      let t = Date.now();
      const created = await sessionService.startSession({
        userPrompt: description || businessName,
        pipelineMode: "intro",
        targetDuration,
        voiceId,
        aspectRatio,
      });
      setSessionId(created.id);
      setSession(created);
      setScriptProgress(12);
      log(`session ${created.id} created in ${since(t)}`);

      phase = "uploading the logo";
      t = Date.now();
      await sessionService.uploadLogo(created.id, logoFile);
      setScriptProgress(16);
      log(`logo uploaded in ${since(t)}`);

      phase = "uploading your photos";
      t = Date.now();
      if (showcaseFiles.length > 0) {
        await sessionService.uploadImages(created.id, showcaseFiles, showcaseLabels);
        log(`${showcaseFiles.length} photo(s) uploaded in ${since(t)} as ${showcaseLabels.join(", ")}`);
      }
      setScriptProgress(18);

      phase = "saving the brief";
      t = Date.now();
      await sessionService.saveIntroBrief(created.id, {
        businessName, description, brandColors, fonts: brandFonts, tone: brandTone,
      });
      setScriptProgress(20);
      log(`brief saved in ${since(t)}`);

      // The long one: a plan, then a voiceover and a rendered clip per scene. The
      // bar reads the job's own progress rather than being ticked by hand here,
      // because the backend is the only thing that knows which scene it is on.
      phase = "building the scenes";
      t = Date.now();
      let lastLabel = "";
      const withScenes = await sessionService.generateIntroScenes(created.id, {
        onProgress: (status) => {
          const pct = status?.jobProgress?.percentage;
          if (Number.isFinite(pct)) setScriptProgress(20 + Math.round(pct * 0.8));
          const label = status?.jobProgress?.label;
          if (!label) return;
          setScriptLabel(label);
          // Only when the backend moves on, not on every poll: this fires every 3
          // seconds for several minutes, and a log of the same line 80 times over
          // is what makes the useful ones impossible to find.
          if (label !== lastLabel) {
            lastLabel = label;
            log(`${label} (${Number.isFinite(pct) ? pct : "?"}% of the job, ${since(startedAt)} in)`);
          }
        },
      });
      setSession(withScenes);
      const s = scriptFromIntroData(withScenes.introData);
      if (s) setIntroScript(s);
      setScriptProgress(100);
      const built = s?.scenes || [];
      log(`scenes built in ${since(t)}: ${built.length} scene(s) [${built.map((sc) => sc?.type || "?").join(", ")}], ${built.filter((sc) => sc?.clipUrl).length} with a clip`);
      log(`ready in ${since(startedAt)} total`);

      setDirection(1);
      setStep(1);
      toast.success("Your scenes are ready. Watch them, then approve.");
    } catch (err) {
      console.error(`[intro] FAILED while ${phase}, ${since(startedAt)} in:`, err);
      setSession(null);
      setSessionId(null);
      setScriptProgress(0);
      setDirection(-1);
      setStep(0);
      const { userMessage } = describeError(err, "We couldn't start your intro. Please try again.");
      setError(userMessage);
      if (isProviderUnavailable(err)) {
        setProviderUnavailable({ message: err.response.data.error });
      } else if (err.response?.status === 402) {
        toast.info("You need at least 1 credit to generate an intro.");
        navigate("/buy-credits");
      } else {
        toast.error(userMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [logoFile, businessName, description, targetDuration, voiceId, aspectRatio, showcaseFiles, showcaseLabels, brandColors, brandFonts, brandTone, credits, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the step-level fields. Scene content is never sent from here: a scene is
  // changed through reviseScenes, the only path that also re-renders its clip.
  const saveScriptEdits = useCallback(async (overrides = {}) => {
    if (!sessionId) return null;
    const updated = await sessionService.updateIntroScript(sessionId, {
      businessName: introScript.businessName,
      musicPrompt: introScript.musicPrompt,
      voiceId,
      ...overrides,
    });
    setSession(updated);
    return updated;
  }, [sessionId, introScript, voiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Rework any number of scenes from the notes written against them.
   *
   * Deliberately does NOT set the global `loading`. That flag is what puts the
   * fullscreen ScriptLoadingScreen over the step, and a rework belongs on the cards
   * it is changing, not over the whole page. The step disables its own destructive
   * actions off `reworkingIndexes` instead.
   *
   * @param {Array<{index:number, note:string}>} edits
   * @returns {Promise<{ok:number[], failed:Array<{index:number,error:string}>}>}
   */
  const reviseScenes = useCallback(async (edits) => {
    const list = (edits || []).filter((e) => e && String(e.note || "").trim());
    if (!sessionId || !list.length) return { ok: [], failed: [] };

    const indexes = list.map((e) => e.index);
    setReworkingIndexes(indexes);
    setReworkLabel("Rewriting");
    const startedAt = Date.now();
    log(`reworking ${list.length} scene(s): ${list.map((e) => `${e.index + 1} "${String(e.note).slice(0, 60)}"`).join(" | ")}`);
    try {
      let lastLabel = "";
      const updated = await sessionService.reviseIntroScenes(sessionId, list, {
        onProgress: (status) => {
          const label = status?.jobProgress?.label;
          if (!label) return;
          setReworkLabel(label);
          if (label !== lastLabel) {
            lastLabel = label;
            log(`${label} (${since(startedAt)} in)`);
          }
        },
      });
      // null means the poll saw a different job take the slot. Leave the step as it
      // is rather than clearing notes for work that may not have happened.
      if (!updated) {
        log(`rework abandoned after ${since(startedAt)}: another job took the slot`);
        return { ok: [], failed: [] };
      }

      setSession(updated);
      const s = scriptFromIntroData(updated.introData);
      if (s) setIntroScript(s);

      const failed = Array.isArray(updated.reviseFailures) ? updated.reviseFailures : [];
      const bad = new Set(failed.map((f) => f.index));
      const ok = indexes.filter((i) => !bad.has(i));
      log(`rework done in ${since(startedAt)}: ${ok.length} changed [${ok.map((i) => i + 1).join(", ") || "none"}]${failed.length ? `, ${failed.length} failed [${failed.map((f) => `${f.index + 1}: ${f.error}`).join("; ")}]` : ""}`);

      if (failed.length && ok.length) {
        toast.warning(
          `${ok.length} of ${indexes.length} scenes reworked. ${failed.map((f) => `Scene ${f.index + 1}`).join(", ")} could not be changed.`
        );
      } else if (failed.length) {
        toast.error("We couldn't rework those scenes. Try describing the change differently.");
      } else {
        toast.success(ok.length > 1 ? `${ok.length} scenes reworked.` : `Scene ${ok[0] + 1} reworked.`);
      }
      return { ok, failed };
    } catch (err) {
      console.error(`[intro] rework FAILED after ${since(startedAt)}:`, err);
      toast.error(describeError(err, "We couldn't rework those scenes. Please try again.").userMessage);
      return { ok: [], failed: indexes.map((index) => ({ index, error: "failed" })) };
    } finally {
      setReworkingIndexes([]);
      setReworkLabel("");
    }
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Approve + generate
  const approveAndGenerate = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await saveScriptEdits();
      await sessionService.approveScript(sessionId);
    } catch (err) {
      setLoading(false);
      toast.error(describeError(err, "We couldn't approve your scenes. Please try again.").userMessage);
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
    setTargetDuration(DEFAULT_INTRO_DURATION);
    setAspectRatio(getCreationDefaults().aspectRatio);
    setShowcaseFiles([]);
    setShowcaseLabels([]);
    setBrandColors(null);
    setBrandFonts(null);
    setBrandTone(null);
    brandTouchedRef.current = false;
    setIntroScript(EMPTY_SCRIPT);
    setReworkingIndexes([]);
    setReworkLabel("");
    setScriptLabel("");
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
    // After ...base on purpose: the base exposes its own shared targetDuration and
    // the intro pipeline's local one has to win.
    targetDuration, setTargetDuration,
    aspectRatio, setAspectRatio,
    brandColors, setBrandColor,
    brandFonts, setBrandFont,
    brandTone,
    applyExtractedBrand,
    showcaseFiles, setShowcaseFiles,
    showcaseLabels, setShowcaseLabels,

    // Review
    introScript, setIntroScript, updateScriptField,
    reworkingIndexes,
    reworkLabel,
    voiceId, setVoiceId,
    scriptProgress: base.scriptProgress,
    scriptLabel,

    // Actions
    startIntroSession,
    saveScriptEdits,
    reviseScenes,
    approveAndGenerate,

    // Navigation
    goToStep,
    handlePrev,
    reset,

    STAGES,
  };
}
