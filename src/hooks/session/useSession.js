import { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import * as sessionService from "@/services/session";

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

// Map backend stages to frontend step numbers
// Image upload/analysis are handled during startSession and do not have dedicated pages
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

// Video models
const VIDEO_MODELS = [
  { id: "KLING", name: "Kling", description: "Best for cinematic motion" },
  { id: "HUNYUAN", name: "Hunyuan", description: "Good for realistic content" },
  { id: "WAN", name: "Wan", description: "Fast for social media" },
  { id: "VEO", name: "Veo 3.1", description: "Dramatic effects" },
];

// Style options
const STYLE_OPTIONS = [
  { id: "cinematic", name: "Cinematic", description: "Epic, dramatic, emotional" },
  { id: "documentary", name: "Documentary", description: "Authentic, grounded" },
  { id: "social", name: "Social", description: "Upbeat, trendy, fast-paced" },
  { id: "dramatic", name: "Dramatic", description: "Intense, suspenseful" },
];

export function useSession() {
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [userPrompt, setUserPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const imageDuration = 10; // seconds per image
  const [voiceId, setVoiceId] = useState("adam");
  const [videoModel, setVideoModel] = useState("KLING");

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
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

  // Script generation progress (0-100)
  const [scriptProgress, setScriptProgress] = useState(0);

  // Sync step with session stage
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
        setVideoModel(session.videoModel);
      }
    }
  }, [session]);

  // Poll for session updates during generation
  useEffect(() => {
    let pollInterval;

    if (sessionId && step === 3) {
      pollInterval = setInterval(async () => {
        try {
          const updatedSession = await sessionService.getSession(sessionId);
          setSession(updatedSession);

          if (updatedSession.stage === "COMPLETED") {
            clearInterval(pollInterval);
            setFinalVideoUrl(updatedSession.video?.finalVideoUrl);
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
  }, [sessionId, step]);

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
      // This way the AI can analyze the generated frame images too
      console.log("[useSession] Processing frame images...");
      const frameOptions = {};
      const newGeneratedFrameImages = { opening: null, closing: null };

      if (openingFrame.enabled) {
        if (openingFrame.useUpload && openingFrame.uploadedFile) {
          // Upload the user's frame image — no AI generation needed
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
          // AI Generate mode — generate an image using the user's custom prompt
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
          // Upload the user's frame image — no AI generation needed
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
          // AI Generate mode — generate an image using the user's custom prompt
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

      // Step 5: Generate script - AI now has access to the generated frame images for analysis
      console.log("[useSession] Generating script...");
      console.log("[useSession] Frame options:", frameOptions);
      setScriptProgress(75);
      const sessionAfterScript = await sessionService.generateScript(newSession.id, frameOptions);
      console.log("[useSession] Script generated:", sessionAfterScript);
      setSession(sessionAfterScript);
      setScriptData(sessionAfterScript.scriptData);
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
      toast.error(err.response?.data?.error || "Failed to start session");
    } finally {
      setLoading(false);
      console.log("[useSession] startSession completed");
    }
  }, [userPrompt, style, voiceId, images, openingFrame, closingFrame, videoModel]);

  // Add images to pool
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
        // Upload the image first to get URL
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
        // AI Generate mode — generate an image using the user's custom prompt
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
        // Upload the image first to get URL
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
        // AI Generate mode — generate an image using the user's custom prompt
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
      console.log("[useSession] Expected step from stage:", STAGE_TO_STEP[updatedSession?.stage]);
      
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
        const formData = new FormData();
        formData.append("images", openingFrame.uploadedFile);
        // Upload as session image and get URL
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

    // Immediately transition to GeneratingStep (step 3) so user sees
    // the detailed progress UI instead of generic "Processing..." overlay
    console.log("[useSession] Transitioning to GeneratingStep (step 3) immediately");
    setDirection(1);
    setStep(3);

    try {
      console.log("[useSession] Calling sessionService.startGeneration...");
      const updatedSession = await sessionService.startGeneration(sessionId, {
        videoModel,
        voiceId,
      });
      console.log("[useSession] startGeneration response:", updatedSession);
      setSession(updatedSession);
      toast.success("Video generation started!");
    } catch (err) {
      console.error("[useSession] startGeneration failed:", err);
      console.error("[useSession] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error("Failed to start generation");
      // Go back to frames step if generation failed to start
      setDirection(-1);
      setStep(2);
    }
  }, [sessionId, videoModel, voiceId]);

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
    // Cleanup image previews
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });

    setSessionId(null);
    setSession(null);
    setStep(0);
    setDirection(0);
    setUserPrompt("");
    setStyle("cinematic");
    setTargetDuration(60);
    setVoiceId("adam");
    setVideoModel("KLING");
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
    voiceId,
    setVoiceId,
    videoModel,
    setVideoModel,

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
    finalVideoUrl,
    scriptProgress,

    // Actions
    startSession,
    uploadImages,
    analyzeImages,
    generateScript,
    updateScript,
    editScriptWithAI,
    approveScript,
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
    VIDEO_MODELS,
    STYLE_OPTIONS,
    STAGES,
  };
}
