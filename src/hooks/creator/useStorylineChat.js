import { sendMessage } from "@/services/chat";
import { useState } from "react";
import { convertTranscript } from "../utils/helper";

console.log("[useStorylineChat] Hook module loaded");

export function useStorylineChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleSendMessage = async (messageText) => {
    console.log("[useStorylineChat] handleSendMessage called");
    console.log("[useStorylineChat] messageText:", messageText);

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    console.log("[useStorylineChat] Created user message:", userMessage);

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    console.log("[useStorylineChat] Updated messages count:", updatedMessages.length);
    console.log("[useStorylineChat] Loading set to true");

    try {
      console.log("[useStorylineChat] Converting transcript...");
      const historyForBackend = convertTranscript(updatedMessages, "transcript");
      console.log("[useStorylineChat] historyForBackend:", historyForBackend);

      console.log("[useStorylineChat] Calling sendMessage...");
      const res = await sendMessage(messageText, historyForBackend);
      console.log("[useStorylineChat] Response received:", res);

      if (res.success === true) {
        console.log("[useStorylineChat] Success! Reply:", res.reply);
        const assistantMessage = {
          id: Date.now() + 1,
          text: res.reply,
          sender: "assistant",
          timestamp: new Date(),
        };
        console.log("[useStorylineChat] Created assistant message:", assistantMessage);
        setMessages((prev) => [...prev, assistantMessage]);
        if (res.complete === true) {
          console.log("[useStorylineChat] Conversation complete!");
          setComplete(true);
        }
      } else {
        console.log("[useStorylineChat] Response success was false:", res);
      }
    } catch (error) {
      console.error("[useStorylineChat] ERROR:", error);
      console.error("[useStorylineChat] Error message:", error.message);
      console.error("[useStorylineChat] Error response:", error.response);
    } finally {
      console.log("[useStorylineChat] Setting loading to false");
      setLoading(false);
    }
  };

  const handleCardClick = (cardDescription) => {
    handleSendMessage(cardDescription);
  };

  return {
    messages,
    loading,
    complete,
    setComplete,
    setMessages,
    handleSendMessage,
    handleCardClick,
  };
}
