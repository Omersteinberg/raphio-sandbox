import { useEffect, useState } from "react";
import { useStorylineChat } from "./useStorylineChat";
import { useImageSequencer } from "./useImageSequencer";
import { usePreviewSelector } from "./usePreviewSelector";
import { saveTranscript } from "@/services/chat";
import { generatePreviewVideos, uploadImages } from "@/services/images";
import { toast } from "react-toastify";
import { createSession, getSession } from "@/services/chat";
import { convertGCPImages, convertTranscript } from "../utils/helper";

export function useCreator() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const storylineChat = useStorylineChat();
  const imageSequencer = useImageSequencer();
  const previewSelector = usePreviewSelector();
  const [loading, setLoading] = useState(false);

  const uploadTranscript = async (messages) => {
    const historyForBackend = messages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    }));
    return await saveTranscript(historyForBackend);
  };

  const handleNext = async () => {
    console.log("check step", step);
      if (step === 0) {
        const res = await uploadTranscript(storylineChat.messages);

        console.log("res:", res);

        if (res?.success === true) {
          toast.success("Successfully saved transcript!");
          setDirection(1);
          setStep((prev) => prev + 1);
        } else {
          toast.error("Failed to save transcript.");
        }
      } else if (step === 1) {
        setLoading(true);

        try {
          const imageRes = await uploadImages(imageSequencer.images);

          imageSequencer.setImages(imageRes.images);

          const previewRes = await generatePreviewVideos();

          console.log("check preview videos", previewRes);

          previewSelector.setPreviewVideos(previewRes.videoProviders);

          if (previewRes?.success) {
            toast.success("Successfully uploaded images!");
            setDirection(1);
            setStep((prev) => prev + 1);
          } else {
            toast.error("Failed to upload images.");
          }
        } catch (error) {
          toast.error("An error occurred during image upload.");
        } finally {
          setLoading(false);
        }
      } else if (step === 2) {
        setDirection(1);
        setStep((prev) => prev + 1);
      }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((prev) => prev - 1);
      storylineChat.setComplete(false);
    }
  };

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

  return {
    step,
    direction,
    setStep,
    setDirection,
    handleNext,
    handlePrev,
    storylineChat,
    imageSequencer,
    previewSelector,
    loading,
  };
}
