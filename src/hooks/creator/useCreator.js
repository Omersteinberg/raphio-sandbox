import { useEffect, useState } from "react";
import { useStorylineChat } from "./useStorylineChat";
import { useImageSequencer } from "./useImageSequencer";
import { usePreviewSelector } from "./usePreviewSelector";
import { useScriptReview } from "./useScriptReview";
import { useVoiceSelector } from "./useVoiceSelector";
import { useImagePool } from "./useImagePool";
import { saveTranscript } from "@/services/chat";
import { generatePreviewVideos, uploadImages } from "@/services/images";
import { generateScript } from "@/services/scripts";
import {
  createVideo,
  attachScript,
  uploadVideoImages,
  startGeneration,
  getProgress,
} from "@/services/videos";
import { toast } from "react-toastify";
import { createSession, getSession } from "@/services/chat";
import { convertGCPImages, convertTranscript } from "../utils/helper";

// New combined step flow
const STEPS = {
  CHAT_UPLOAD: 0,      // Chat + Image Upload side by side
  SECTIONS_VOICE: 1,   // Sections + Voice Selection side by side
  PREVIEW: 2,          // Preview + AI Provider selection
  PROCESSING: 3,
  RESULT: 4,
};

export function useCreator() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const storylineChat = useStorylineChat();
  const scriptReview = useScriptReview();
  const imageSequencer = useImageSequencer();
  const voiceSelector = useVoiceSelector();
  const previewSelector = usePreviewSelector();
  const imagePool = useImagePool();
  const [loading, setLoading] = useState(false);
  const [selectedAI, setSelectedAI] = useState("runway");

  // Video project state
  const [videoId, setVideoId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [processingError, setProcessingError] = useState(null);

  const uploadTranscript = async (messages) => {
    const historyForBackend = messages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    }));
    return await saveTranscript(historyForBackend);
  };

  // Extract prompt from chat messages
  const getPromptFromChat = () => {
    const userMessages = storylineChat.messages
      .filter((msg) => msg.sender === "user")
      .map((msg) => msg.text)
      .join(" ");
    return userMessages;
  };

  const handleNext = async () => {
    console.log("[useCreator] handleNext - current step:", step);

    if (step === STEPS.CHAT_UPLOAD) {
      // Step 0 → Step 1: Generate script from chat, then go to Sections+Voice
      if (imagePool.images.length === 0) {
        toast.error("Please upload at least one image.");
        return;
      }

      setLoading(true);
      try {
        const res = await uploadTranscript(storylineChat.messages);
        console.log("[useCreator] transcript res:", res);

        // Generate script from the chat prompt
        const prompt = getPromptFromChat();
        const scriptRes = await generateScript(prompt, 60);

        if (scriptRes?.success && scriptRes?.data) {
          scriptReview.setScript(scriptRes.data);
          scriptReview.setSections(scriptRes.data.sections || []);
          toast.success("Script generated successfully!");
          setDirection(1);
          setStep(STEPS.SECTIONS_VOICE);
        } else {
          toast.error("Failed to generate script.");
        }
      } catch (error) {
        console.error("[useCreator] Error generating script:", error);
        toast.error("Failed to generate script.");
      } finally {
        setLoading(false);
      }
    } else if (step === STEPS.SECTIONS_VOICE) {
      // Step 1 → Step 2: Go to Preview
      console.log("[useCreator] Checking sections and voice...");

      const imagesCount = scriptReview.getImagesCount();
      const sectionsCount = scriptReview.sections.length;
      console.log("[useCreator] Images:", imagesCount, "Sections:", sectionsCount);

      if (imagesCount < sectionsCount) {
        toast.error(`Please assign images to all sections (${imagesCount}/${sectionsCount})`);
        return;
      }

      if (!voiceSelector.selectedVoice) {
        toast.error("Please select a voice.");
        return;
      }

      setDirection(1);
      setStep(STEPS.PREVIEW);
    } else if (step === STEPS.PREVIEW) {
      // Step 2 → Step 3: Start video generation
      console.log("[useCreator] Starting video generation from Preview...");

      // Get images from sections
      const sectionImages = scriptReview.getAllImages();
      console.log("[useCreator] Section images:", sectionImages);

      if (sectionImages.length === 0) {
        toast.error("Please assign images to each section.");
        return;
      }

      setLoading(true);
      try {
        // Create video project
        console.log("[useCreator] Creating video project...");
        const createRes = await createVideo(scriptReview.script?.title || "Untitled");
        console.log("[useCreator] Create video response:", createRes);

        if (!createRes?.success) {
          throw new Error("Failed to create video project");
        }
        const newVideoId = createRes.data.id;
        console.log("[useCreator] Video ID:", newVideoId);
        setVideoId(newVideoId);

        // Attach script with selected voice
        console.log("[useCreator] Attaching script...");
        const scriptData = {
          title: scriptReview.script?.title || "Untitled",
          sections: scriptReview.sections,
        };
        const attachRes = await attachScript(newVideoId, scriptData, voiceSelector.selectedVoice);
        console.log("[useCreator] Attach script response:", attachRes);

        // Upload images from sections
        console.log("[useCreator] Uploading images...");
        const imageFiles = sectionImages.map(img => img.file);
        const uploadRes = await uploadVideoImages(newVideoId, imageFiles);
        console.log("[useCreator] Upload images response:", uploadRes);

        // Start generation
        console.log("[useCreator] Starting generation...");
        const genRes = await startGeneration(newVideoId, voiceSelector.selectedVoice);
        console.log("[useCreator] Start generation response:", genRes);

        toast.success("Video generation started!");
        setDirection(1);
        setStep(STEPS.PROCESSING);
      } catch (error) {
        console.error("[useCreator] ERROR starting generation:", error);
        toast.error("Failed to start video generation: " + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    } else if (step === STEPS.PROCESSING) {
      // Step 3 → Step 4: Proceed to result
      setDirection(1);
      setStep(STEPS.RESULT);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((prev) => prev - 1);
      if (step === STEPS.SECTIONS_VOICE) {
        storylineChat.setComplete(false);
      }
    }
  };

  // Poll for progress during processing
  useEffect(() => {
    let pollInterval;

    if (step === STEPS.PROCESSING && videoId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await getProgress(videoId);
          if (res?.success && res?.data) {
            setProgress(res.data.progress);
            if (res.data.finalVideoUrl) {
              setFinalVideoUrl(res.data.finalVideoUrl);
              clearInterval(pollInterval);
              // Auto-advance to result
              setDirection(1);
              setStep(STEPS.RESULT);
            }
            if (res.data.status === "FAILED") {
              setProcessingError("Video generation failed");
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error("Error polling progress:", error);
        }
      }, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, videoId]);

  useEffect(() => {
    if (storylineChat.complete) {
      handleNext();
    }
  }, [storylineChat.complete]);

  // TODO: temporarily load session or create new session
  // useEffect(() => {
  //   const fetchSession = async () => {
  //     sessionStorage.setItem("sessionId", "1");
  //     let sessionId = "1";

  //     // load session from db
  //     const res = await getSession(sessionId);
  //     if (res?.success === true) {
  //       console.log("res", res);
  //       const parsedHistory = JSON.parse(res.history);
  //       console.log(parsedHistory);
  //       console.log(typeof parsedHistory);
  //       console.log(
  //         "parsedHistory",
  //         parsedHistory,
  //         Array.isArray(parsedHistory)
  //       );
  //       // set messages convert
  //       storylineChat.setMessages(convertTranscript(parsedHistory, "chat"));
  //       const parsedImages = JSON.parse(res.images);
  //       console.log(
  //         "parsedImages",
  //         parsedImages,
  //         Array.isArray(parsedImages),
  //         convertGCPImages(parsedImages)
  //       );
  //       imageSequencer.setImages(parsedImages);
  //     }
  //   };

  //   fetchSession();
  // }, []);

  const handleRegenerate = () => {
    // Reset and go back to chat
    scriptReview.reset();
    storylineChat.setComplete(false);
    setDirection(-1);
    setStep(STEPS.CHAT_UPLOAD);
  };

  const handleCreateAnother = () => {
    // Reset everything
    storylineChat.reset?.();
    scriptReview.reset();
    imageSequencer.setImages([]);
    imagePool.reset();
    voiceSelector.setSelectedVoice(null);
    setSelectedAI("runway");
    setVideoId(null);
    setProgress(null);
    setFinalVideoUrl(null);
    setProcessingError(null);
    setDirection(-1);
    setStep(STEPS.CHAT_UPLOAD);
  };

  return {
    step,
    direction,
    setStep,
    setDirection,
    handleNext,
    handlePrev,
    handleRegenerate,
    handleCreateAnother,
    storylineChat,
    scriptReview,
    imageSequencer,
    imagePool,
    voiceSelector,
    previewSelector,
    selectedAI,
    setSelectedAI,
    loading,
    // Video state
    videoId,
    progress,
    finalVideoUrl,
    processingError,
    STEPS,
  };
}
