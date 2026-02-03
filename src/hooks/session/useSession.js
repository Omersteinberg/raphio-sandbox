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
// After prompt is entered, we move to step 1 (ImagesStep) to upload images
const STAGE_TO_STEP = {
  PROMPT_ENTERED: 1,
  IMAGES_UPLOADED: 1,
  IMAGES_ANALYZED: 2,
  SCRIPT_GENERATED: 3,
  SCRIPT_APPROVED: 4,
  FRAMES_CONFIGURED: 4,
  GENERATING: 5,
  COMPLETED: 6,
  EDITING: 7,
};

// Video models
const VIDEO_MODELS = [
  { id: "KLING", name: "Kling", description: "Best for cinematic motion" },
  { id: "HUNYUAN", name: "Hunyuan", description: "Good for realistic content" },
  { id: "WAN", name: "Wan", description: "Fast for social media" },
  { id: "LUMA", name: "Luma", description: "Dramatic effects" },
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
  const [targetDuration, setTargetDuration] = useState(60);
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
    customPrompt: "",
    uploadedImageUrl: null,
  });
  const [closingFrame, setClosingFrame] = useState({
    enabled: false,
    customPrompt: "",
    callToAction: "",
    uploadedImageUrl: null,
  });

  // Generation state
  const [generationProgress, setGenerationProgress] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

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

    if (sessionId && step === 5) {
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
      targetDuration,
      voiceId,
      imagesCount: images?.length || 0,
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

    try {
      // Step 1: Create the session
      console.log("[useSession] Calling sessionService.startSession...");
      const payload = {
        userPrompt,
        style,
        targetDuration,
        voiceId,
      };
      console.log("[useSession] Request payload:", payload);

      const newSession = await sessionService.startSession(payload);
      
      console.log("[useSession] Session created successfully:", newSession);

      setSessionId(newSession.id);
      setSession(newSession);

      // Step 2: Upload the images that were already selected
      console.log("[useSession] Uploading images to session...");
      const files = images.map((img) => img.file);
      const sessionAfterUpload = await sessionService.uploadImages(newSession.id, files);
      console.log("[useSession] Images uploaded:", sessionAfterUpload);
      setSession(sessionAfterUpload);

      // Step 3: Start image analysis
      console.log("[useSession] Starting image analysis...");
      const sessionAfterAnalysis = await sessionService.analyzeImages(newSession.id);
      console.log("[useSession] Image analysis complete:", sessionAfterAnalysis);
      setSession(sessionAfterAnalysis);
      setImageAnalysis(sessionAfterAnalysis.imageAnalysis);

      // Step 4: Generate script
      console.log("[useSession] Generating script...");
      const sessionAfterScript = await sessionService.generateScript(newSession.id);
      console.log("[useSession] Script generated:", sessionAfterScript);
      setSession(sessionAfterScript);
      setScriptData(sessionAfterScript.scriptData);

      setDirection(1);
      setStep(3); // Go directly to ScriptStep
      toast.success("Script generated! Review and approve your script.");
    } catch (err) {
      console.error("[useSession] Failed to start session:", err);
      console.error("[useSession] Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message);
      toast.error(err.response?.data?.error || "Failed to start session");
    } finally {
      setLoading(false);
      console.log("[useSession] startSession completed");
    }
  }, [userPrompt, style, targetDuration, voiceId, images]);

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

  // Generate script
  const generateScript = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const updatedSession = await sessionService.generateScript(sessionId);
      setSession(updatedSession);
      setScriptData(updatedSession.scriptData);
      toast.success("Script generated!");
    } catch (err) {
      toast.error("Failed to generate script");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

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
      const frameConfig = {
        opening: openingFrame.enabled ? {
          customPrompt: openingFrame.customPrompt || null,
          uploadedImageUrl: openingFrame.uploadedImageUrl || null,
        } : null,
        closing: closingFrame.enabled ? {
          customPrompt: closingFrame.customPrompt || null,
          callToAction: closingFrame.callToAction || null,
          uploadedImageUrl: closingFrame.uploadedImageUrl || null,
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
  }, [sessionId, openingFrame, closingFrame]);

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

    // Immediately transition to GeneratingStep (step 5) so user sees
    // the detailed progress UI instead of generic "Processing..." overlay
    console.log("[useSession] Transitioning to GeneratingStep (step 5) immediately");
    setDirection(1);
    setStep(5);

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
      setStep(4);
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
    if (!sessionId) return;

    setLoading(true);
    try {
      await sessionService.regenerateNarration(sessionId, clipId, options);
      const updatedSession = await sessionService.getSession(sessionId);
      setSession(updatedSession);
      toast.success("Narration regenerated!");
    } catch (err) {
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
    setOpeningFrame({ enabled: false, customPrompt: "", uploadedImageUrl: null });
    setClosingFrame({ enabled: false, customPrompt: "", callToAction: "", uploadedImageUrl: null });
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
    targetDuration,
    setTargetDuration,
    voiceId,
    setVoiceId,
    videoModel,
    setVideoModel,

    // Images
    images,
    addImages,
    removeImage,
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

    // Generation
    generationProgress,
    finalVideoUrl,

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
