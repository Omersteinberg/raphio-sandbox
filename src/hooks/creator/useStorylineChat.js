import { sendMessage } from "@/services/chat";
import { useState } from "react";
import { convertTranscript } from "../utils/helper";

export function useStorylineChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleSendMessage = async (messageText) => {
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const historyForBackend = convertTranscript(updatedMessages, "transcript");

      console.log("historyForBackend:", historyForBackend);

      const res = await sendMessage(messageText, historyForBackend);

      console.log("data:", res );

      if (res.success === true) {
        console.log("assistant reply:", res.reply);
        const assistantMessage = {
          id: Date.now() + 1,
          text: res.reply,
          sender: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (res.complete === true) {
          setComplete(true);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
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
