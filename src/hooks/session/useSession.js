import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import * as sessionService from "@/services/session";
import { useSessionBase, STAGES } from "./useSessionBase";
import { STYLE_OPTIONS } from '../../constants/styles';

// Map backend stages to frontend step numbers (image pipeline)
const STAGE_TO_STEP = {
  PROMPT_ENTERED: 1,
  IMAGES_UPLOADED: 1,
  IMAGES_ANALYZED: 1,
  SCRIPT_GENERATED: 1,
  SCRIPT_APPROVED: 2,
  FRAMES_CONFIGURED: 2,
  GENERATING: 3,
  COMPLETED: 4,
  EDITING: 5,
};

export function useSession() {
  // ── Image-pipeline step state ──────────────────────────────────────
  const [step, setStep] = useState(0);

  // Stable ref for onSessionLoaded so base hook doesn't re-trigger effect
  const onSessionLoadedRef = useRef(null);

  // ── Base hook ──────────────────────────────────────────────────────
  const base = useSessionBase({
    generatingStep: 3,
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
    scriptData, setScriptData, editRequest,
    scriptProgress, setScriptProgress,
    generationProgress, setGenerationProgress,
    insufficientCredits, setInsufficientCredits,
    finalVideoUrl, setFinalVideoUrl,
    navigate, refreshCredits,
    startGeneration: baseStartGeneration,
    resetBase,
  } = base;

  // ── Image-pipeline specific state ──────────────────────────────────
  const imageDuration = 5; // seconds per image
  const [images, setImages] = useState([]);
  const [imageAnalysis, setImageAnalysis] = useState(null);

  // Frame configuration
  const [openingFrame, setOpeningFrame] = useState({
    enabled: false,
    useUpload: false,
    customPrompt: "",
    textOverlay: "",
    description: "",
    uploadedImage: null,
    uploadedFile: null,
  });
  const [closingFrame, setClosingFrame] = useState({
    enabled: false,
    useUpload: false,
    customPrompt: "",
    textOverlay: "",
    description: "",
    uploadedImage: null,
    uploadedFile: null,
  });

  // Generated frame images (from DALL-E)
  const [generatedFrameImages, setGeneratedFrameImages] = useState({
    opening: null,
    closing: null,
  });

  // ── Restore image-specific state when resuming a session ───────────
  onSessionLoadedRef.current = (data) => {
    if (data.images?.length) {
      setImages(data.images.map((img) => ({
        id: img.id,
        preview: img.imageUrl,
        uploaded: true,
      })));
    }
  };

  // ── Sync step with session stage (image pipeline mapping) ──────────
  useEffect(() => {
    if (session?.stage) {
      const newStep = STAGE_TO_STEP[session.stage] ?? 0;
      console.log("[useSession] Stage sync effect triggered");
      console.log("[useSession] Current session.stage:", session.stage);
      console.log("[useSession] Mapped to step:", newStep);
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
        base.setVideoModel(session.videoModel);
      }
    }
  }, [session]);

  // ── Start session with prompt (image pipeline) ─────────────────────
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

    setLoading(true);
    setError(null);
    setScriptProgress(0);

    try {
      // Step 1: Create the session
      console.log("[useSession] Calling sessionService.startSession...");
      setScriptProgress(5);
      const payload = {
        userPrompt,
        style,
        imageDuration,
        voiceId,
      };
      console.log("[useSession] Request payload:", payload);

      const newSession = await sessionService.startSession(payload);

      console.log("[useSession] Session created successfully:", newSession);
      setScriptProgress(15);

      setSessionId(newSession.id);
      setSession(newSession);

      // Step 2: Upload the images that were already selected
      console.log("[useSession] Uploading images to session...");
      setScriptProgress(20);
      const files = images.map((img) => img.file);
      const sessionAfterUpload = await sessionService.uploadImages(newSession.id, files);
      console.log("[useSession] Images uploaded:", sessionAfterUpload);
      setSession(sessionAfterUpload);
      setScriptProgress(35);

      // Step 3: Start image analysis
      console.log("[useSession] Starting image analysis...");
      setScriptProgress(40);
      const sessionAfterAnalysis = await sessionService.analyzeImages(newSession.id);
      console.log("[useSession] Image analysis complete:", sessionAfterAnalysis);
      setSession(sessionAfterAnalysis);
      setImageAnalysis(sessionAfterAnalysis.imageAnalysis);
      setScriptProgress(55);

      // Step 4: Generate frame images (if AI generate is selected) BEFORE script generation
      console.log("[useSession] Processing frame images...");
      const frameOptions = {};
      const newGeneratedFrameImages = { opening: null, closing: null };

      if (openingFrame.enabled) {
        if (openingFrame.useUpload && openingFrame.uploadedFile) {
          const uploadResult = await sessionService.uploadImages(newSession.id, [openingFrame.uploadedFile]);
          if (uploadResult.images?.length > 0) {
            const uploadedUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
            frameOptions.opening = "user_image";
            frameOptions.openingImageUrl = uploadedUrl;
            newGeneratedFrameImages.opening = {
              imageUrl: uploadedUrl,
              prompt: null,
            };
            console.log("[useSession] Opening frame image uploaded:", uploadedUrl);
          }
        } else if (!openingFrame.useUpload && openingFrame.customPrompt) {
          console.log("[useSession] Generating AI opening frame with CUSTOM PROMPT:", openingFrame.customPrompt);
          console.log("[useSession] Opening frame description:", openingFrame.description);
          try {
            const frameResult = await sessionService.generateFrameImage(
              newSession.id,
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
        if (openingFrame.textOverlay) {
          frameOptions.openingNarration = openingFrame.textOverlay;
        }
        if (openingFrame.description) {
          frameOptions.openingDescription = openingFrame.description;
        }
      } else {
        frameOptions.opening = "none";
      }

      if (closingFrame.enabled) {
        if (closingFrame.useUpload && closingFrame.uploadedFile) {
          const uploadResult = await sessionService.uploadImages(newSession.id, [closingFrame.uploadedFile]);
          if (uploadResult.images?.length > 0) {
            const uploadedUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
            frameOptions.closing = "user_image";
            frameOptions.closingImageUrl = uploadedUrl;
            newGeneratedFrameImages.closing = {
              imageUrl: uploadedUrl,
              prompt: null,
            };
            console.log("[useSession] Closing frame image uploaded:", uploadedUrl);
          }
        } else if (!closingFrame.useUpload && closingFrame.customPrompt) {
          console.log("[useSession] Generating AI closing frame image...");
          try {
            const frameResult = await sessionService.generateFrameImage(
              newSession.id,
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
        if (closingFrame.textOverlay) {
          frameOptions.closingNarration = closingFrame.textOverlay;
        }
        if (closingFrame.description) {
          frameOptions.closingDescription = closingFrame.description;
        }
      } else {
        frameOptions.closing = "none";
      }

      setGeneratedFrameImages(newGeneratedFrameImages);
      setScriptProgress(70);

      // Step 5: Generate script
      console.log("[useSession] Generating script...");
      console.log("[useSession] Frame options:", frameOptions);
      setScriptProgress(75);
      const sessionAfterScript = await sessionService.generateScript(newSession.id, frameOptions);
      console.log("[useSession] Script generated:", sessionAfterScript);
      setSession(sessionAfterScript);
      setScriptData(sessionAfterScript.scriptData);
      setScriptProgress(100);

      setDirection(1);
      setStep(1);
      toast.success("Script generated! Review and approve your script.");
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      console.error("[useSession] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setSession(null);
      setSessionId(null);
      setScriptProgress(0);
      setDirection(-1);
      setStep(0);
      setError(err.message);
      if (err.response?.status === 402) {
        toast.error("Insufficient credits");
        navigate('/buy-credits');
      } else {
        toast.error(err.response?.data?.error || "Failed to start session");
      }
    } finally {
      setLoading(false);
      console.log("[useSession] startSession completed");
    }
  }, [userPrompt, style, voiceId, images, openingFrame, closingFrame, videoModel, navigate]);

  // ── Add images to pool ─────────────────────────────────────────────
  const addImages = useCallback((files) => {
    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setImages((prev) => [...prev, ...newImages]);
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

  // Reorder images
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
          const uploadResult = await sessionService.uploadImages(sessionId, [openingFrame.uploadedFile]);
          if (uploadResult.images?.length > 0) {
            const uploadedUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
            frameOptions.opening = "user_image";
            frameOptions.openingImageUrl = uploadedUrl;
            newGeneratedFrameImages.opening = {
              imageUrl: uploadedUrl,
              prompt: null,
            };
          }
        }
      } else if (!openingFrame.useUpload && openingFrame.customPrompt) {
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
    } else {
      frameOptions.opening = "none";
    }

    // Closing frame
    if (closingFrame.enabled) {
      if (closingFrame.useUpload && closingFrame.uploadedFile) {
        if (sessionId) {
          const uploadResult = await sessionService.uploadImages(sessionId, [closingFrame.uploadedFile]);
          if (uploadResult.images?.length > 0) {
            const uploadedUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
            frameOptions.closing = "user_image";
            frameOptions.closingImageUrl = uploadedUrl;
            newGeneratedFrameImages.closing = {
              imageUrl: uploadedUrl,
              prompt: null,
            };
          }
        }
      } else if (!closingFrame.useUpload && closingFrame.customPrompt) {
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
    } else {
      frameOptions.closing = "none";
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
      const updatedSession = await sessionService.generateScript(sessionId, frameOptions);
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);
      toast.success("Script generated!");
    } catch (err) {
      toast.error("Failed to generate script");
    } finally {
      setLoading(false);
    }
  }, [sessionId, buildFrameOptions]);

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
      let openingImageUrl = generatedFrameImages.opening?.imageUrl || null;
      let closingImageUrl = generatedFrameImages.closing?.imageUrl || null;

      if (openingFrame.enabled && openingFrame.useUpload && openingFrame.uploadedFile) {
        console.log("[useSession] Uploading opening frame image...");
        const formData = new FormData();
        formData.append("images", openingFrame.uploadedFile);
        const uploadResult = await sessionService.uploadImages(sessionId, [openingFrame.uploadedFile]);
        if (uploadResult.images?.length > 0) {
          openingImageUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
        }
      }

      if (closingFrame.enabled && closingFrame.useUpload && closingFrame.uploadedFile) {
        console.log("[useSession] Uploading closing frame image...");
        const uploadResult = await sessionService.uploadImages(sessionId, [closingFrame.uploadedFile]);
        if (uploadResult.images?.length > 0) {
          closingImageUrl = uploadResult.images[uploadResult.images.length - 1].imageUrl;
        }
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

  // Start generation (image pipeline wrapper)
  const startGeneration = useCallback(async () => {
    console.log("[useSession] startGeneration called");
    console.log("[useSession] sessionId:", sessionId);
    console.log("[useSession] videoModel:", videoModel);
    console.log("[useSession] voiceId:", voiceId);

    if (!sessionId) {
      console.log("[useSession] No sessionId, aborting startGeneration");
      return;
    }

    // Immediately transition to GeneratingStep (step 3) so user sees
    // the detailed progress UI instead of generic "Processing..." overlay
    console.log("[useSession] Transitioning to GeneratingStep (step 3) immediately");
    setDirection(1);
    setStep(3);

    const result = await baseStartGeneration({
      videoModel,
      voiceId,
      backgroundMusic,
    });

    if (result && !result.success) {
      if (result.reason === "insufficient_credits") {
        setDirection(-1);
        setStep(2);
      } else if (result.reason === "network_error") {
        // Stay on step 3, let polling pick up
      } else {
        // server_error — go back
        setDirection(-1);
        setStep(2);
      }
    }
  }, [sessionId, videoModel, voiceId, backgroundMusic, baseStartGeneration]);

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

  // Reset session (image pipeline)
  const reset = useCallback(() => {
    // Cleanup image previews
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });

    // Reset base shared state
    resetBase();

    // Reset image-pipeline specific state
    setStep(0);
    setImages([]);
    setImageAnalysis(null);
    setOpeningFrame({ enabled: false, useUpload: false, customPrompt: "", textOverlay: "", description: "", uploadedImage: null, uploadedFile: null });
    setClosingFrame({ enabled: false, useUpload: false, customPrompt: "", textOverlay: "", description: "", uploadedImage: null, uploadedFile: null });
    setGeneratedFrameImages({ opening: null, closing: null });
  }, [images, resetBase]);

  return {
    // Spread all base shared state & callbacks
    ...base,

    // Override/add image-pipeline specifics
    step,
    direction: base.direction,
    loading: base.loading,
    error: base.error,

    // Form state
    imageDuration,

    // Images
    images,
    addImages,
    removeImage,
    reorderImages,
    imageAnalysis,

    // Frames
    openingFrame,
    setOpeningFrame,
    closingFrame,
    setClosingFrame,
    generatedFrameImages,

    // Generation (override base with pipeline-specific wrapper)
    startGeneration,
    scriptProgress: base.scriptProgress,
    generationProgress: base.generationProgress,
    finalVideoUrl: base.finalVideoUrl,
    insufficientCredits: base.insufficientCredits,
    dismissInsufficientCredits: base.dismissInsufficientCredits,

    // Actions
    startSession,
    uploadImages,
    analyzeImages,
    generateScript,
    updateScript: base.updateScript,
    editScriptWithAI: base.editScriptWithAI,
    approveScript: base.approveScript,
    configureFrames,
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
  };
}
