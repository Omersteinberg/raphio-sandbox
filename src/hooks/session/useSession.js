import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as sessionService from "@/services/session";
import { fetchStyles } from "@/services/session";
import { useAuth } from "@/hooks/useAuth";
import { MAX_IMAGES, creditsForDuration } from "@/lib/limits";
import { savePending, clearPending } from "@/lib/pendingSession";

// Encode a File to a base64 data URL. We persist prompt-step photos to
// IndexedDB as data URLs (not raw File handles) because a File restored from
// IndexedDB after a page refresh doesn't reliably reload into a usable object
// URL (notably in Firefox), which showed up as blank photo previews.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Session stages matching backend
const STAGES = {
  PROMPT: "PROMPT",
  IMAGES: "IMAGES",
  ANALYSIS: "ANALYSIS",
  SCRIPT: "SCRIPT",
  FRAMES: "FRAMES",
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  EDITING: "EDITING",
};

// Map backend stages to frontend step numbers.
// When bridges are enabled the flow has an extra "bridges" step between
// outline review and frames configuration, shifting later steps up by 1.
function getStageToStep(bridgesEnabled) {
  if (bridgesEnabled) {
    return {
      PROMPT_ENTERED: 1,
      IMAGES_UPLOADED: 1,
      IMAGES_ANALYZED: 1,
      OUTLINE_GENERATED: 1,
      SCRIPT_GENERATED: 2,
      SCRIPT_APPROVED: 3,
      FRAMES_CONFIGURED: 3,
      GENERATING: 4,
      COMPLETED: 5,
      EDITING: 6,
    };
  }
  // No bridges: skip the bridges review step entirely
  return {
    PROMPT_ENTERED: 1,
    IMAGES_UPLOADED: 1,
    IMAGES_ANALYZED: 1,
    OUTLINE_GENERATED: 1,
    SCRIPT_GENERATED: 2,   // goes straight to frames config
    SCRIPT_APPROVED: 2,
    FRAMES_CONFIGURED: 2,
    GENERATING: 3,
    COMPLETED: 4,
    EDITING: 5,
  };
}


export function useSession() {
  const navigate = useNavigate();
  const { credits, refreshCredits } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const skipResumeRef = useRef(false);
  // Cache of File -> data URL so re-saving the draft (e.g. on prompt edits)
  // doesn't re-encode photos that haven't changed.
  const pendingDataUrlCache = useRef(new Map());

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [userPrompt, setUserPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const imageDuration = 5; // seconds per image
  const [targetDuration, setTargetDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceId, setVoiceId] = useState("adam");
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(true);
  const [enableBridges, setEnableBridges] = useState(false);

  // Images state
  const [images, setImages] = useState([]);
  const [imageAnalysis, setImageAnalysis] = useState(null);

  // Script state
  const [scriptData, setScriptData] = useState(null);
  const [editRequest, setEditRequest] = useState("");

  // Frame configuration
  const [openingFrame, setOpeningFrame] = useState({
    enabled: false,
    useUpload: false,
    customPrompt: "",
    textOverlay: "",
    description: "",     // explanation of what's happening and how AI should use it
    uploadedImage: null, // base64 data URL for preview
    uploadedFile: null,  // actual File object for upload
  });
  const [closingFrame, setClosingFrame] = useState({
    enabled: false,
    useUpload: false,
    customPrompt: "",
    textOverlay: "",
    description: "",     // explanation of what's happening and how AI should use it
    uploadedImage: null, // base64 data URL for preview
    uploadedFile: null,  // actual File object for upload
  });

  // Generated frame images (from DALL-E)
  const [generatedFrameImages, setGeneratedFrameImages] = useState({
    opening: null, // { imageUrl, prompt }
    closing: null, // { imageUrl, prompt }
  });

  // Generation state
  const [generationProgress, setGenerationProgress] = useState(null);
  const [insufficientCredits, setInsufficientCredits] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  // Script generation progress (0-100)
  const [scriptProgress, setScriptProgress] = useState(0);

  // Persist the prompt-step draft (prompt, style, picked photos) to IndexedDB on
  // every change so a hard refresh (or an aborted upload) can't lose the
  // user's photos. Saving only on unmount (the old behaviour) misses a real
  // page refresh, which is exactly the case we need to survive. The photos are
  // restored on mount by ImagePipelineCreator and re-sent to the backend on
  // Create; the local copy is cleared only once the backend confirms receipt.
  useEffect(() => {
    if (sessionId || step !== 0) return;

    const hasDraft = Boolean(userPrompt?.trim()) || images.length > 0;
    if (!hasDraft) return;

    let cancelled = false;
    (async () => {
      // Encode photos to base64 data URLs (reusing the cache for unchanged
      // Files) so they survive a refresh and reload into working previews.
      const cache = pendingDataUrlCache.current;
      const encoded = await Promise.all(
        images.map(async (img) => {
          let dataUrl = cache.get(img.file);
          if (!dataUrl) {
            dataUrl = await fileToDataUrl(img.file);
            cache.set(img.file, dataUrl);
          }
          return { dataUrl, name: img.name };
        })
      );
      if (cancelled) return;
      await savePending("image", { userPrompt, style, images: encoded });
    })().catch((err) => {
      console.warn("[useSession] autosave pending failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, step, userPrompt, style, images]);

  // Style options (fetched from API)
  const [styleOptions, setStyleOptions] = useState([]);

  // Image pipeline only supports original 4 styles
  const IMAGE_PIPELINE_STYLES = ['realistic', 'animated', 'cinematic', 'surreal'];

  useEffect(() => {
    fetchStyles()
      .then((styles) => setStyleOptions(styles.filter(s => IMAGE_PIPELINE_STYLES.includes(s.id))))
      .catch((err) => {
        console.error('Failed to fetch styles:', err);
        // Fallback to hardcoded styles if API fails
        setStyleOptions([
          { id: "realistic", name: "Realistic", description: "Photorealistic, natural, lifelike" },
          { id: "animated", name: "Animated", description: "Cartoon, vibrant, stylized" },
          { id: "cinematic", name: "Cinematic", description: "Film-like, dramatic, moody" },
          { id: "surreal", name: "Surreal", description: "Dreamlike, abstract, artistic" },
        ]);
      });
  }, []);

  // Sync sessionId to URL so refresh restores the session
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

  // Resume session from query param
  const resumeSessionId = searchParams.get("session");
  useEffect(() => {
    if (skipResumeRef.current) {
      skipResumeRef.current = false;
      return;
    }
    if (resumeSessionId && !sessionId) {
      const loadSession = async () => {
        try {
          setLoading(true);
          const data = await sessionService.getSession(resumeSessionId);
          if (data) {
            // Wrong creator: this is a references (or other) session, bounce to it.
            if (data.pipelineMode && data.pipelineMode !== "image"
                && ["image", "references"].includes(data.pipelineMode)) {
              navigate(`/create?session=${resumeSessionId}&mode=${data.pipelineMode}`, { replace: true });
              return;
            }
            setSessionId(resumeSessionId);
            setSession(data);
            if (data.userPrompt) setUserPrompt(data.userPrompt);
            if (data.style) setStyle(data.style);
            if (data.aspectRatio) setAspectRatio(data.aspectRatio);
            if (data.voiceId) setVoiceId(data.voiceId);
            if (data.videoModel) setVideoModel(data.videoModel);
            if (data.enableBridges != null) setEnableBridges(data.enableBridges);
            if (data.images?.length) {
              setImages(data.images.map((img) => ({
                id: img.id,
                preview: img.imageUrl,
                uploaded: true,
              })));
            }
            if (data.scriptData) setScriptData(data.scriptData);

            // Restore frame UI state + previews from persisted frame configs
            // so returning from /buy-credits (or any navigation) doesn't
            // silently reset the user's choices or drop the generated images.
            const restoredGenerated = { opening: null, closing: null };
            if (data.openingFrameConfig) {
              const cfg = data.openingFrameConfig;
              setOpeningFrame((prev) => ({
                ...prev,
                enabled: true,
                useUpload: !cfg.customPrompt && !!cfg.uploadedImageUrl,
                customPrompt: cfg.customPrompt || "",
                textOverlay: cfg.textOverlay || "",
                description: cfg.visualDescription || "",
                uploadedImage: cfg.uploadedImageUrl || null,
              }));
              if (cfg.uploadedImageUrl) {
                restoredGenerated.opening = {
                  imageUrl: cfg.uploadedImageUrl,
                  prompt: cfg.customPrompt || null,
                };
              }
            }
            if (data.closingFrameConfig) {
              const cfg = data.closingFrameConfig;
              setClosingFrame((prev) => ({
                ...prev,
                enabled: true,
                useUpload: !cfg.customPrompt && !!cfg.uploadedImageUrl,
                customPrompt: cfg.customPrompt || "",
                textOverlay: cfg.textOverlay || "",
                description: cfg.visualDescription || "",
                uploadedImage: cfg.uploadedImageUrl || null,
              }));
              if (cfg.uploadedImageUrl) {
                restoredGenerated.closing = {
                  imageUrl: cfg.uploadedImageUrl,
                  prompt: cfg.customPrompt || null,
                };
              }
            }
            if (restoredGenerated.opening || restoredGenerated.closing) {
              setGeneratedFrameImages(restoredGenerated);
            }
          }
        } catch (err) {
          console.error("[useSession] Failed to load session:", err);
          toast.error("Failed to load session");
          navigate("/videos");
        } finally {
          setLoading(false);
        }
      };
      loadSession();
    }
  }, [resumeSessionId, sessionId, navigate]);

  // Sync step with session stage
  useEffect(() => {
    if (session?.stage) {
      const stageMap = getStageToStep(enableBridges);
      // Resume/refresh after a failed generation: backend rolled the stage back to
      // SCRIPT_APPROVED but flagged the Video FAILED. Pin to the generating step so
      // the failure screen + Regenerate shows instead of silently dropping back.
      const genFailed =
        (session.video?.status === "FAILED" || session.video?.progressData?.stage === "FAILED") &&
        session.stage !== "GENERATING";
      const generatingStep = enableBridges ? 4 : 3;
      const newStep = genFailed ? generatingStep : (stageMap[session.stage] ?? 0);
      if (genFailed && !generationError) {
        setGenerationError(session.video?.progressData?.error || "Video generation failed. Please try again.");
      }
      console.log("[useSession] Stage sync effect triggered");
      console.log("[useSession] Current session.stage:", session.stage);
      console.log("[useSession] Mapped to step:", newStep, "(enableBridges:", enableBridges, ")");
      console.log("[useSession] Current step:", step);

      if (newStep !== step) {
        console.log("[useSession] Changing step from", step, "to", newStep);
        setDirection(newStep > step ? 1 : -1);
        setStep(newStep);
      }

      // Update local state from session
      if (session.imageAnalysis) {
        setImageAnalysis(session.imageAnalysis);
      }
      if (session.scriptData) {
        setScriptData(session.scriptData);
      }
      if (session.video?.finalVideoUrl) {
        setFinalVideoUrl(session.video.finalVideoUrl);
      }
      if (session.videoModel) {
        setVideoModel(session.videoModel);
      }
    }
  }, [session]);

  // Poll for session updates during generation
  useEffect(() => {
    let pollInterval;

    const generatingStep = enableBridges ? 4 : 3;
    if (sessionId && step === generatingStep && !generationError) {
      pollInterval = setInterval(async () => {
        try {
          const updatedSession = await sessionService.getSession(sessionId);

          // Generation failed: surface the error, stop polling, let the user retry.
          // Do NOT setSession here: the backend resets the stage to SCRIPT_APPROVED
          // on failure, which would bounce the user off the generating screen before
          // they see the error. generationError keeps them here with the message
          // and a Regenerate button.
          if ((updatedSession.video?.status === "FAILED" || updatedSession.video?.progressData?.stage === "FAILED")
              && updatedSession.stage !== "GENERATING") {
            clearInterval(pollInterval);
            const msg = updatedSession.video?.progressData?.error || "Video generation failed. Please try again.";
            setGenerationError(msg);
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
          }
        } catch (err) {
          console.error("Error polling session:", err);
        }
      }, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, step, generationError, enableBridges]);

  // Start session with prompt
  const startSession = useCallback(async () => {
    console.log("[useSession] startSession called");
    console.log("[useSession] Current state:", {
      userPrompt: userPrompt?.substring(0, 50),
      style,
      imageDuration,
      voiceId,
      imagesCount: images?.length || 0,
      openingFrame: { enabled: openingFrame.enabled, useUpload: openingFrame.useUpload, customPrompt: openingFrame.customPrompt, description: openingFrame.description },
      closingFrame: { enabled: closingFrame.enabled, useUpload: closingFrame.useUpload, customPrompt: closingFrame.customPrompt, description: closingFrame.description },
    });

    if (!userPrompt.trim()) {
      console.log("[useSession] No prompt entered, aborting");
      toast.error("Please enter a prompt");
      return;
    }

    if (images.length === 0) {
      console.log("[useSession] No images added, aborting");
      toast.error("Please add at least one image");
      return;
    }

    const requiredCredits = creditsForDuration(targetDuration);
    if (credits != null && requiredCredits > 0 && credits < requiredCredits) {
      try {
        // Convert File objects to base64 strings for IndexedDB serialization
        const imagesToSave = await Promise.all(
          images.map((img) =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  dataUrl: reader.result, // base64 data URL
                  name: img.name,
                });
              };
              reader.readAsDataURL(img.file);
            })
          )
        );

        await savePending("image", {
          userPrompt,
          style,
          images: imagesToSave,
        });
      } catch (err) {
        console.warn("[useSession] Failed to save pending session:", err);
      }
      toast.info(`You need ${requiredCredits} credits for a ${targetDuration}s video. Your work is saved.`);
      navigate("/buy-credits");
      return;
    }

    setLoading(true);
    setError(null);
    setScriptProgress(1);

    try {
      let targetSessionId;

      // Resuming a session that already has images uploaded on the backend
      // (e.g. the user left and came back after image upload/analysis
      // succeeded but script generation hadn't run yet). Images restored from
      // a resumed session have no `.file` data to re-upload, so reuse the
      // existing session and its already-uploaded images instead of creating
      // a new session and posting empty files.
      const isResuming = Boolean(sessionId && session?.images?.length > 0);

      if (isResuming) {
        console.log("[useSession] Resuming existing session:", sessionId);
        targetSessionId = sessionId;
        setScriptProgress(35);

        if (session.imageAnalysis) {
          console.log("[useSession] Images already analyzed, skipping analysis/restyle");
          setImageAnalysis(session.imageAnalysis);
          setScriptProgress(70);
        } else {
          console.log("[useSession] Starting image analysis...");
          setScriptProgress(40);
          const sessionAfterAnalysis = await sessionService.analyzeImages(targetSessionId);
          console.log("[useSession] Image analysis complete:", sessionAfterAnalysis);
          setSession(sessionAfterAnalysis);
          setImageAnalysis(sessionAfterAnalysis.imageAnalysis);
          setScriptProgress(55);

          console.log("[useSession] Waiting for restyle jobs to complete...");
          const restyleResult = await sessionService.pollRestyleUntilDone(targetSessionId, {
            onProgress: (status) => {
              console.log(`[useSession] Restyle progress: ${status.complete}/${status.total} complete, ${status.pending} pending, ${status.failed} failed`);
              if (status.total > 0) {
                const settled = status.complete + status.skipped + status.failed;
                const ratio = settled / status.total;
                setScriptProgress(55 + Math.round(ratio * 15));
              }
            },
          });
          console.log("[useSession] Restyle complete:", restyleResult);
          if (restyleResult.failed > 0) {
            toast.warn(`${restyleResult.failed} image(s) failed to restyle, using originals.`);
          }
          setScriptProgress(70);
        }
      } else {
        // Step 1: Create the session
        console.log("[useSession] Calling sessionService.startSession...");
        setScriptProgress(5);
        const payload = {
          userPrompt,
          style,
          imageDuration,
          voiceId,
          enableBridges,
          targetDuration,
        };
        console.log("[useSession] Request payload:", payload);

        const newSession = await sessionService.startSession(payload);

        console.log("[useSession] Session created successfully:", newSession);
        setScriptProgress(15);

        targetSessionId = newSession.id;
        setSessionId(targetSessionId);
        setSession(newSession);

        // Step 2: Upload the images that were already selected
        console.log("[useSession] Uploading images to session...");
        setScriptProgress(20);
        const files = images.map((img) => img.file);
        const sessionAfterUpload = await sessionService.uploadImages(targetSessionId, files);
        console.log("[useSession] Images uploaded:", sessionAfterUpload);

        // The upload connection can drop mid-transfer (a refresh, or a proxy
        // resetting a large request), leaving zero images persisted. Verify the
        // backend actually has them before continuing. We keep the IndexedDB
        // copy until this check passes, so on failure the user returns to the
        // prompt with their photos intact to retry, instead of crashing
        // downstream with "No images to analyze".
        if (!sessionAfterUpload.images?.length) {
          console.warn("[useSession] Upload persisted no images, aborting before analyze");
          setSession(null);
          setSessionId(null);
          setScriptProgress(0);
          setDirection(-1);
          setStep(0);
          setError("Your photos didn't finish uploading. Please try again.");
          toast.error("Your photos didn't finish uploading. Please tap Create my video again.");
          return;
        }

        // Photos are safely persisted on the backend now, drop the local copy.
        try { await clearPending("image"); } catch (err) { console.warn("[useSession] clearPending failed:", err); }

        setSession(sessionAfterUpload);
        setScriptProgress(35);

        // Step 3: Start image analysis
        console.log("[useSession] Starting image analysis...");
        setScriptProgress(40);
        const sessionAfterAnalysis = await sessionService.analyzeImages(targetSessionId);
        console.log("[useSession] Image analysis complete:", sessionAfterAnalysis);
        setSession(sessionAfterAnalysis);
        setImageAnalysis(sessionAfterAnalysis.imageAnalysis);
        setScriptProgress(55);

        // Step 3a: Wait for Flux Kontext restyle jobs (kicked off by /analyze) to
        // finish. /analyze submits the jobs and returns immediately, so we have
        // to poll before generating the script, otherwise the script would be
        // built from the pre-restyle (e.g. photo) images.
        console.log("[useSession] Waiting for restyle jobs to complete...");
        const restyleResult = await sessionService.pollRestyleUntilDone(targetSessionId, {
          onProgress: (status) => {
            console.log(`[useSession] Restyle progress: ${status.complete}/${status.total} complete, ${status.pending} pending, ${status.failed} failed`);
            // Map restyle progress into the 55-70 band of the overall progress bar.
            if (status.total > 0) {
              const settled = status.complete + status.skipped + status.failed;
              const ratio = settled / status.total;
              setScriptProgress(55 + Math.round(ratio * 15));
            }
          },
        });
        console.log("[useSession] Restyle complete:", restyleResult);
        if (restyleResult.failed > 0) {
          toast.warn(`${restyleResult.failed} image(s) failed to restyle, using originals.`);
        }
        setScriptProgress(70);
      }

      // Step 4: Generate frame images (if AI generate is selected) BEFORE script generation
      // This way the AI can analyze the generated frame images too
      console.log("[useSession] Processing frame images...");
      const frameOptions = {};
      const newGeneratedFrameImages = { opening: null, closing: null };

      // OPENING frame: gather user-supplied input. If user supplied nothing,
      // omit the field so the backend auto-figures-out from script context.
      if (openingFrame?.useUpload && openingFrame?.uploadedFile) {
        const uploadResult = await sessionService.uploadImages(targetSessionId, [openingFrame.uploadedFile]);
        if (uploadResult.images?.length > 0) {
          const uploadedUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
          frameOptions.opening = "user_image";
          frameOptions.openingImageUrl = uploadedUrl;
          newGeneratedFrameImages.opening = { imageUrl: uploadedUrl, prompt: null };
          console.log("[useSession] Opening frame image uploaded:", uploadedUrl);
        }
      } else if (!openingFrame?.useUpload && openingFrame?.customPrompt) {
        console.log("[useSession] Generating AI opening frame with CUSTOM PROMPT:", openingFrame.customPrompt);
        try {
          const frameResult = await sessionService.generateFrameImage(
            targetSessionId,
            "opening",
            openingFrame.customPrompt,
            openingFrame.description || ""
          );
          if (frameResult?.imageUrl) {
            frameOptions.opening = "ai_generated_image";
            frameOptions.openingImageUrl = frameResult.imageUrl;
            newGeneratedFrameImages.opening = { imageUrl: frameResult.imageUrl, prompt: openingFrame.customPrompt };
            console.log("[useSession] Opening frame image generated:", frameResult.imageUrl);
          } else {
            frameOptions.opening = "ai_generate";
            frameOptions.openingPrompt = openingFrame.customPrompt;
          }
        } catch (err) {
          console.warn("[useSession] Failed to pre-generate opening frame image, falling back:", err);
          frameOptions.opening = "ai_generate";
          frameOptions.openingPrompt = openingFrame.customPrompt;
        }
      }
      if (openingFrame?.textOverlay) {
        frameOptions.openingNarration = openingFrame.textOverlay;
      }
      if (openingFrame?.description) {
        frameOptions.openingDescription = openingFrame.description;
      }

      // CLOSING frame: same shape as opening.
      if (closingFrame?.useUpload && closingFrame?.uploadedFile) {
        const uploadResult = await sessionService.uploadImages(targetSessionId, [closingFrame.uploadedFile]);
        if (uploadResult.images?.length > 0) {
          const uploadedUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
          frameOptions.closing = "user_image";
          frameOptions.closingImageUrl = uploadedUrl;
          newGeneratedFrameImages.closing = { imageUrl: uploadedUrl, prompt: null };
          console.log("[useSession] Closing frame image uploaded:", uploadedUrl);
        }
      } else if (!closingFrame?.useUpload && closingFrame?.customPrompt) {
        console.log("[useSession] Generating AI closing frame image…");
        try {
          const frameResult = await sessionService.generateFrameImage(
            targetSessionId,
            "closing",
            closingFrame.customPrompt,
            closingFrame.description || ""
          );
          if (frameResult?.imageUrl) {
            frameOptions.closing = "ai_generated_image";
            frameOptions.closingImageUrl = frameResult.imageUrl;
            newGeneratedFrameImages.closing = { imageUrl: frameResult.imageUrl, prompt: closingFrame.customPrompt };
            console.log("[useSession] Closing frame image generated:", frameResult.imageUrl);
          } else {
            frameOptions.closing = "ai_generate";
            frameOptions.closingPrompt = closingFrame.customPrompt;
          }
        } catch (err) {
          console.warn("[useSession] Failed to pre-generate closing frame image, falling back:", err);
          frameOptions.closing = "ai_generate";
          frameOptions.closingPrompt = closingFrame.customPrompt;
        }
      }
      if (closingFrame?.textOverlay) {
        frameOptions.closingNarration = closingFrame.textOverlay;
      }
      if (closingFrame?.description) {
        frameOptions.closingDescription = closingFrame.description;
      }

      setGeneratedFrameImages(newGeneratedFrameImages);
      setScriptProgress(70);

      // Step 5: Generate script - AI now has access to the generated frame images for analysis
      console.log("[useSession] Generating script...");
      console.log("[useSession] Frame options:", frameOptions);
      setScriptProgress(75);

      // Script generation is a single backend job that runs several sequential
      // LLM passes (classify → write → refine → QA). The backend now reports a
      // sub-stage % via jobProgress; map it into the 75-98 band. Between those
      // milestones, gently creep the bar (decelerating toward 98) so it never
      // looks frozen during a long single pass. A real milestone snaps it ahead.
      let scriptCreep = 75;
      const applyCreep = (value) => {
        scriptCreep = Math.max(scriptCreep, value);
        const v = Math.round(scriptCreep);
        setScriptProgress((prev) => Math.max(prev, v));
      };
      const creepTimer = setInterval(() => applyCreep(scriptCreep + (98 - scriptCreep) * 0.02), 500);

      let sessionAfterScript;
      try {
        sessionAfterScript = await sessionService.generateOutline(targetSessionId, frameOptions, {
          onProgress: (jobProgress) => {
            if (jobProgress && typeof jobProgress.percentage === "number") {
              // backend 0-100 → overall 75-98
              applyCreep(75 + (jobProgress.percentage / 100) * 23);
            }
          },
        });
      } finally {
        clearInterval(creepTimer);
      }
      console.log("[useSession] Script generated:", sessionAfterScript);
      setSession(sessionAfterScript);
      setScriptData(sessionAfterScript.scriptData);

      // If the backend auto-pre-generated frame images (auto path),
      // their URLs land in {opening,closing}FrameConfig.uploadedImageUrl.
      // Surface those into generatedFrameImages so ScriptStep can render them.
      const backendOpeningUrl = sessionAfterScript?.openingFrameConfig?.uploadedImageUrl;
      const backendClosingUrl = sessionAfterScript?.closingFrameConfig?.uploadedImageUrl;
      if (backendOpeningUrl || backendClosingUrl) {
        setGeneratedFrameImages((prev) => ({
          opening: prev.opening || (backendOpeningUrl ? { imageUrl: backendOpeningUrl, prompt: null } : null),
          closing: prev.closing || (backendClosingUrl ? { imageUrl: backendClosingUrl, prompt: null } : null),
        }));
      }
      setScriptProgress(100);

      setDirection(1);
      setStep(1); // Go directly to ScriptStep
      toast.success("Script generated! Review and approve your script.");
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      console.error("[useSession] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      // Reset session state so stage sync doesn't advance the step
      setSession(null);
      setSessionId(null);
      setScriptProgress(0);
      setDirection(-1);
      setStep(0);
      setError(err.message);
      if (err.response?.status === 402) {
        try {
          await savePending("image", {
            userPrompt,
            style,
            images: images.map((img) => ({ file: img.file, name: img.name })),
          });
        } catch (saveErr) {
          console.warn("[useSession] Failed to save pending on 402:", saveErr);
        }
        toast.info(`You need ${creditsForDuration(targetDuration)} credits for a ${targetDuration}s video. Your work is saved.`);
        navigate('/buy-credits');
      } else {
        toast.error(err.response?.data?.error || "Failed to start session");
      }
    } finally {
      setLoading(false);
      console.log("[useSession] startSession completed");
    }
  }, [userPrompt, style, voiceId, images, openingFrame, closingFrame, videoModel, enableBridges, credits, navigate, sessionId, session]);

  // Add images to pool (capped at MAX_IMAGES per video)
  const addImages = useCallback((files) => {
    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setImages((prev) => {
      const room = MAX_IMAGES - prev.length;
      if (room <= 0) {
        newImages.forEach((img) => URL.revokeObjectURL(img.preview));
        toast.error(`Maximum ${MAX_IMAGES} images per video`);
        return prev;
      }
      const accepted = newImages.slice(0, room);
      const rejected = newImages.slice(room);
      rejected.forEach((img) => URL.revokeObjectURL(img.preview));
      if (rejected.length > 0) {
        toast(`Only added ${accepted.length}, limit is ${MAX_IMAGES} per video`);
      }
      return [...prev, ...accepted];
    });
  }, []);

  // Remove image from pool
  const removeImage = useCallback((index) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Reorder images (move image from one index to another)
  const reorderImages = useCallback((fromIndex, toIndex) => {
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  // Upload images to session
  const uploadImages = useCallback(async () => {
    if (!sessionId) {
      toast.error("No session found");
      return;
    }

    if (images.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    setLoading(true);
    try {
      const files = images.map((img) => img.file);
      const updatedSession = await sessionService.uploadImages(sessionId, files);
      setSession(updatedSession);
      toast.success("Images uploaded!");
    } catch (err) {
      toast.error("Failed to upload images");
    } finally {
      setLoading(false);
    }
  }, [sessionId, images]);

  // Analyze images
  const analyzeImages = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const updatedSession = await sessionService.analyzeImages(sessionId);
      setSession(updatedSession);
      setImageAnalysis(updatedSession.imageAnalysis);
      toast.success("Image analysis complete!");
    } catch (err) {
      toast.error("Failed to analyze images");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Build frame options for script generation
  const buildFrameOptions = useCallback(async () => {
    const frameOptions = {};
    const newGeneratedFrameImages = { opening: null, closing: null };

    // Opening frame
    if (openingFrame.enabled) {
      if (openingFrame.useUpload && openingFrame.uploadedFile) {
        if (sessionId) {
          const { imageUrl: uploadedUrl } = await sessionService.uploadFrameImage(sessionId, openingFrame.uploadedFile);
          frameOptions.opening = "user_image";
          frameOptions.openingImageUrl = uploadedUrl;
          newGeneratedFrameImages.opening = { imageUrl: uploadedUrl, prompt: null };
        }
      } else if (!openingFrame.useUpload && openingFrame.customPrompt) {
        // AI Generate mode: generate an image using the user's custom prompt
        try {
          const frameResult = await sessionService.generateFrameImage(
            sessionId,
            "opening",
            openingFrame.customPrompt,
            openingFrame.description || ""
          );
          if (frameResult?.imageUrl) {
            frameOptions.opening = "ai_generated_image";
            frameOptions.openingImageUrl = frameResult.imageUrl;
            newGeneratedFrameImages.opening = {
              imageUrl: frameResult.imageUrl,
              prompt: openingFrame.customPrompt,
            };
          } else {
            frameOptions.opening = "ai_generate";
            frameOptions.openingPrompt = openingFrame.customPrompt;
          }
        } catch (err) {
          console.warn("[useSession] Failed to pre-generate opening frame image:", err);
          frameOptions.opening = "ai_generate";
          frameOptions.openingPrompt = openingFrame.customPrompt;
        }
      }
      if (openingFrame.textOverlay) {
        frameOptions.openingNarration = openingFrame.textOverlay;
      }
      if (openingFrame.description) {
        frameOptions.openingDescription = openingFrame.description;
      }
    }

    // Closing frame
    if (closingFrame.enabled) {
      if (closingFrame.useUpload && closingFrame.uploadedFile) {
        if (sessionId) {
          const { imageUrl: uploadedUrl } = await sessionService.uploadFrameImage(sessionId, closingFrame.uploadedFile);
          frameOptions.closing = "user_image";
          frameOptions.closingImageUrl = uploadedUrl;
          newGeneratedFrameImages.closing = { imageUrl: uploadedUrl, prompt: null };
        }
      } else if (!closingFrame.useUpload && closingFrame.customPrompt) {
        // AI Generate mode: generate an image using the user's custom prompt
        try {
          const frameResult = await sessionService.generateFrameImage(
            sessionId,
            "closing",
            closingFrame.customPrompt,
            closingFrame.description || ""
          );
          if (frameResult?.imageUrl) {
            frameOptions.closing = "ai_generated_image";
            frameOptions.closingImageUrl = frameResult.imageUrl;
            newGeneratedFrameImages.closing = {
              imageUrl: frameResult.imageUrl,
              prompt: closingFrame.customPrompt,
            };
          } else {
            frameOptions.closing = "ai_generate";
            frameOptions.closingPrompt = closingFrame.customPrompt;
          }
        } catch (err) {
          console.warn("[useSession] Failed to pre-generate closing frame image:", err);
          frameOptions.closing = "ai_generate";
          frameOptions.closingPrompt = closingFrame.customPrompt;
        }
      }
      if (closingFrame.textOverlay) {
        frameOptions.closingNarration = closingFrame.textOverlay;
      }
      if (closingFrame.description) {
        frameOptions.closingDescription = closingFrame.description;
      }
    }

    // Update generated frame images state
    setGeneratedFrameImages((prev) => ({
      opening: newGeneratedFrameImages.opening || prev.opening,
      closing: newGeneratedFrameImages.closing || prev.closing,
    }));

    return frameOptions;
  }, [sessionId, openingFrame, closingFrame, style, userPrompt]);

  // Generate script
  const generateScript = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const frameOptions = await buildFrameOptions();
      const updatedSession = await sessionService.generateOutline(sessionId, frameOptions);
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);
      toast.success("Outline generated!");
    } catch (err) {
      toast.error("Failed to generate script");
      setDirection(-1);
      setStep(0);
    } finally {
      setLoading(false);
    }
  }, [sessionId, buildFrameOptions]);

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
    console.log("[useSession] approveScript called");
    console.log("[useSession] sessionId:", sessionId);
    
    if (!sessionId) {
      console.log("[useSession] No sessionId, aborting approveScript");
      return;
    }

    setLoading(true);
    try {
      // First, save any local script edits to the backend
      if (scriptData) {
        console.log("[useSession] Saving local script edits before approving...");
        await sessionService.updateScript(sessionId, { scriptData });
        console.log("[useSession] Local script edits saved");
      }

      console.log("[useSession] Calling sessionService.approveScript...");
      const updatedSession = await sessionService.approveScript(sessionId);
      console.log("[useSession] approveScript response:", updatedSession);
      console.log("[useSession] New stage:", updatedSession?.stage);

      setSession(updatedSession);
      toast.success("Script approved!");
    } catch (err) {
      console.error("[useSession] approveScript failed:", err);
      console.error("[useSession] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error("Failed to approve script");
    } finally {
      setLoading(false);
    }
  }, [sessionId, scriptData]);

  // Approve outline and generate bridge images
  const approveOutline = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      if (scriptData) {
        await sessionService.updateScript(sessionId, { scriptData });
      }

      const updatedSession = await sessionService.approveOutline(sessionId);
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);

      if (!enableBridges) {
        toast.success("Script approved!");
      } else if (updatedSession.hasBridgeFailures) {
        toast.warning("Some bridge frames failed to generate. You can retry or remove them.");
      } else {
        toast.success("Outline approved! Bridge images generated.");
      }
    } catch (err) {
      toast.error("Failed to approve outline");
    } finally {
      setLoading(false);
    }
  }, [sessionId, scriptData]);

  // Retry failed bridge frames
  const retryBridgeFrames = useCallback(async (orderIndices) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const updatedSession = await sessionService.retryBridgeFrames(sessionId, orderIndices);
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);

      if (updatedSession.hasBridgeFailures) {
        toast.warning("Some bridge frames still failed.");
      } else {
        toast.success("Bridge frames regenerated successfully!");
      }
    } catch (err) {
      toast.error("Failed to retry bridge frames");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Upload user image for a bridge frame
  const uploadBridgeImage = useCallback(async (orderIndex, file) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const updatedSession = await sessionService.uploadBridgeImage(sessionId, orderIndex, file);
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);
      toast.success("Bridge frame image uploaded!");
    } catch (err) {
      toast.error("Failed to upload bridge frame image");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Configure frames
  const configureFrames = useCallback(async () => {
    console.log("[useSession] configureFrames called");
    console.log("[useSession] sessionId:", sessionId);

    if (!sessionId) {
      console.log("[useSession] No sessionId, aborting configureFrames");
      return;
    }

    setLoading(true);
    try {
      // Upload frame images if user chose to upload AND has a new file to upload
      // Otherwise, use the already-uploaded URL from generatedFrameImages (set during startSession)
      let openingImageUrl = generatedFrameImages.opening?.imageUrl || null;
      let closingImageUrl = generatedFrameImages.closing?.imageUrl || null;

      if (openingFrame.enabled && openingFrame.useUpload && openingFrame.uploadedFile) {
        console.log("[useSession] Uploading opening frame image...");
        const { imageUrl } = await sessionService.uploadFrameImage(sessionId, openingFrame.uploadedFile);
        openingImageUrl = imageUrl;
      }

      if (closingFrame.enabled && closingFrame.useUpload && closingFrame.uploadedFile) {
        console.log("[useSession] Uploading closing frame image...");
        const { imageUrl } = await sessionService.uploadFrameImage(sessionId, closingFrame.uploadedFile);
        closingImageUrl = imageUrl;
      }

      const frameConfig = {
        opening: openingFrame.enabled ? {
          useUpload: openingFrame.useUpload,
          customPrompt: openingFrame.useUpload ? null : (openingFrame.customPrompt || null),
          textOverlay: openingFrame.textOverlay || null,
          description: openingFrame.description || null,
          uploadedImageUrl: openingImageUrl,
        } : null,
        closing: closingFrame.enabled ? {
          useUpload: closingFrame.useUpload,
          customPrompt: closingFrame.useUpload ? null : (closingFrame.customPrompt || null),
          textOverlay: closingFrame.textOverlay || null,
          description: closingFrame.description || null,
          uploadedImageUrl: closingImageUrl,
        } : null,
      };

      console.log("[useSession] Frame config:", frameConfig);

      const updatedSession = await sessionService.configureFrames(sessionId, frameConfig);
      console.log("[useSession] configureFrames response:", updatedSession);
      setSession(updatedSession);
      toast.success("Frame configuration saved!");
    } catch (err) {
      console.error("[useSession] configureFrames failed:", err);
      console.error("[useSession] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error("Failed to configure frames");
    } finally {
      setLoading(false);
    }
  }, [sessionId, openingFrame, closingFrame, generatedFrameImages]);

  // Start generation
  const startGeneration = useCallback(async () => {
    console.log("[useSession] startGeneration called");
    console.log("[useSession] sessionId:", sessionId);
    console.log("[useSession] videoModel:", videoModel);
    console.log("[useSession] voiceId:", voiceId);
    
    if (!sessionId) {
      console.log("[useSession] No sessionId, aborting startGeneration");
      return;
    }

    // Clear any prior failure so the generating screen shows progress and polling resumes
    setGenerationError(null);

    // Immediately transition to GeneratingStep so user sees
    // the detailed progress UI instead of generic "Processing..." overlay
    const genStep = enableBridges ? 4 : 3;
    console.log(`[useSession] Transitioning to GeneratingStep (step ${genStep}) immediately`);
    setDirection(1);
    setStep(genStep);

    try {
      console.log("[useSession] Calling sessionService.startGeneration...");
      const updatedSession = await sessionService.startGeneration(sessionId, {
        videoModel,
        voiceId,
        backgroundMusic,
      });
      console.log("[useSession] startGeneration response:", updatedSession);
      // Do NOT setSession here, the 202 response is a stub ({message,sessionId,stage}),
      // not a full session; the poll refreshes the real session within ~5s.
      refreshCredits();
      toast.success("Video generation started!");
    } catch (err) {
      console.error("[useSession] startGeneration failed:", err);
      console.error("[useSession] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      // Insufficient credits: show modal
      const framesStep = enableBridges ? 3 : 2;
      if (err.response?.status === 402) {
        setInsufficientCredits({
          required: err.response.data.required,
          available: err.response.data.available,
        });
        setDirection(-1);
        setStep(framesStep);
        return;
      }
      // Network errors (timeout/CORS) likely mean generation is still running
      // in the background - stay on generating step and let polling pick up the result
      if (err.code === "ERR_NETWORK" || !err.response) {
        console.log("[useSession] Network error - generation likely running in background, continuing to poll...");
        toast.info("Generation in progress... please wait");
        return;
      }
      // Only go back for actual server errors (4xx/5xx with a response)
      toast.error("Failed to start generation");
      setDirection(-1);
      setStep(framesStep);
    }
  }, [sessionId, videoModel, voiceId, backgroundMusic]);

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
    console.log("[useSession] regenerateNarration called");
    console.log("[useSession] sessionId:", sessionId);
    console.log("[useSession] clipId:", clipId);
    console.log("[useSession] options:", options);

    if (!sessionId) {
      console.warn("[useSession] No sessionId, aborting regenerateNarration");
      return;
    }

    setLoading(true);
    try {
      console.log("[useSession] Calling sessionService.regenerateNarration...");
      const result = await sessionService.regenerateNarration(sessionId, clipId, options);
      console.log("[useSession] sessionService.regenerateNarration result:", result);
      const updatedSession = await sessionService.getSession(sessionId);
      console.log("[useSession] Updated session after regeneration:", updatedSession);
      setSession(updatedSession);
      toast.success("Narration regenerated!");
    } catch (err) {
      console.error("[useSession] regenerateNarration failed:", err);
      console.error("[useSession] Error details:", {
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

  // Mark session as completed (used when returning from editing to result)
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

  // Navigation
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

  // Reset session
  const reset = useCallback(() => {
    skipResumeRef.current = true;

    // Cleanup image previews
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });

    setSessionId(null);
    setSession(null);
    setStep(0);
    setDirection(0);
    setUserPrompt("");
    setStyle("realistic");
    setVoiceId("adam");
    setVideoModel("KLING");
    setBackgroundMusic(true);
    setEnableBridges(false);
    setImages([]);
    setImageAnalysis(null);
    setScriptData(null);
    setEditRequest("");
    setOpeningFrame({ enabled: false, useUpload: false, customPrompt: "", textOverlay: "", description: "", uploadedImage: null, uploadedFile: null });
    setClosingFrame({ enabled: false, useUpload: false, customPrompt: "", textOverlay: "", description: "", uploadedImage: null, uploadedFile: null });
    setGeneratedFrameImages({ opening: null, closing: null });
    setGenerationProgress(null);
    setFinalVideoUrl(null);
    setError(null);
    setInsufficientCredits(null);
  }, [images]);

  return {
    // Session
    sessionId,
    session,
    step,
    direction,
    loading,
    error,

    // Form state
    userPrompt,
    setUserPrompt,
    style,
    setStyle,
    imageDuration,
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
    enableBridges,
    setEnableBridges,

    // Images
    images,
    addImages,
    removeImage,
    reorderImages,
    imageAnalysis,

    // Script
    scriptData,
    setScriptData,
    editRequest,
    setEditRequest,

    // Frames
    openingFrame,
    setOpeningFrame,
    closingFrame,
    setClosingFrame,
    generatedFrameImages,

    // Generation
    generationProgress,
    generationError,
    finalVideoUrl,
    scriptProgress,
    insufficientCredits,
    dismissInsufficientCredits: () => setInsufficientCredits(null),

    // Actions
    startSession,
    uploadImages,
    analyzeImages,
    generateScript,
    updateScript,
    editScriptWithAI,
    approveScript,
    approveOutline,
    retryBridgeFrames,
    uploadBridgeImage,
    configureFrames,
    startGeneration,
    updateClip,
    regenerateClip,
    regenerateNarration,
    reorderClips,
    reassembleVideo,
    deleteClip,
    enterEditingMode,
    completeSession,
    refreshSession,

    // Navigation
    goToStep,
    handleNext,
    handlePrev,
    reset,

    // Constants
    styleOptions,
    STAGES,
  };
}
