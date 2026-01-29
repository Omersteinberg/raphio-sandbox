import { useEffect, useState } from "react";
import { useStorylineChat } from "./useStorylineChat";
import { useImageSequencer } from "./useImageSequencer";
import { usePreviewSelector } from "./usePreviewSelector";
import { useScriptReview } from "./useScriptReview";
import { useVoiceSelector } from "./useVoiceSelector";
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

// Step indices
const STEPS = {
  CHAT: 0,
  SCRIPT_REVIEW: 1,
  IMAGE_UPLOAD: 2,
  VOICE_SELECT: 3,
  PROCESSING: 4,
  RESULT: 5,
};

export function useCreator() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const storylineChat = useStorylineChat();
  const scriptReview = useScriptReview();
  const imageSequencer = useImageSequencer();
  const voiceSelector = useVoiceSelector();
  const previewSelector = usePreviewSelector();
  const [loading, setLoading] = useState(false);

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
    console.log("check step", step);

    if (step === STEPS.CHAT) {
      // Step 0 → Step 1: Generate script from chat
      setLoading(true);
      try {
        const res = await uploadTranscript(storylineChat.messages);
        console.log("transcript res:", res);

        // Generate script from the chat prompt
        const prompt = getPromptFromChat();
        const scriptRes = await generateScript(prompt, 60);

        if (scriptRes?.success && scriptRes?.data) {
          scriptReview.setScript(scriptRes.data);
          scriptReview.setSections(scriptRes.data.sections || []);
          toast.success("Script generated successfully!");
          setDirection(1);
          setStep(STEPS.SCRIPT_REVIEW);
        } else {
          toast.error("Failed to generate script.");
        }
      } catch (error) {
        console.error("Error generating script:", error);
        toast.error("Failed to generate script.");
      } finally {
        setLoading(false);
      }
    } else if (step === STEPS.SCRIPT_REVIEW) {
      // Step 1 → Step 2: Proceed to image upload
      setDirection(1);
      setStep(STEPS.IMAGE_UPLOAD);
    } else if (step === STEPS.IMAGE_UPLOAD) {
      // Step 2 → Step 3: Proceed to voice selection
      if (imageSequencer.images.length === 0) {
        toast.error("Please upload at least one image.");
        return;
      }
      setDirection(1);
      setStep(STEPS.VOICE_SELECT);
    } else if (step === STEPS.VOICE_SELECT) {
      // Step 3 → Step 4: Start video generation
      if (!voiceSelector.selectedVoice) {
        toast.error("Please select a voice.");
        return;
      }
      setLoading(true);
      try {
        // Create video project
        const createRes = await createVideo(scriptReview.script?.title || "Untitled");
        if (!createRes?.success) {
          throw new Error("Failed to create video project");
        }
        const newVideoId = createRes.data.id;
        setVideoId(newVideoId);

        // Attach script with selected voice
        const scriptData = {
          title: scriptReview.script?.title || "Untitled",
          sections: scriptReview.sections,
        };
        await attachScript(newVideoId, scriptData, voiceSelector.selectedVoice);

        // Upload images
        await uploadVideoImages(newVideoId, imageSequencer.images);

        // Start generation
        await startGeneration(newVideoId, voiceSelector.selectedVoice);

        toast.success("Video generation started!");
        setDirection(1);
        setStep(STEPS.PROCESSING);
      } catch (error) {
        console.error("Error starting generation:", error);
        toast.error("Failed to start video generation.");
      } finally {
        setLoading(false);
      }
    } else if (step === STEPS.PROCESSING) {
      // Step 4 → Step 5: Proceed to result
      setDirection(1);
      setStep(STEPS.RESULT);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((prev) => prev - 1);
      if (step === STEPS.SCRIPT_REVIEW) {
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
    setStep(STEPS.CHAT);
  };

  const handleCreateAnother = () => {
    // Reset everything
    storylineChat.reset?.();
    scriptReview.reset();
    imageSequencer.setImages([]);
    voiceSelector.setSelectedVoice(null);
    setVideoId(null);
    setProgress(null);
    setFinalVideoUrl(null);
    setProcessingError(null);
    setDirection(-1);
    setStep(STEPS.CHAT);
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
    voiceSelector,
    previewSelector,
    loading,
    // Video state
    videoId,
    progress,
    finalVideoUrl,
    processingError,
    STEPS,
  };
}
