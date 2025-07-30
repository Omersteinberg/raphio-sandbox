// StorylineChat.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import MergeChatbar from "@/components/merge/MergeChatbar";
import MergeCard from "@/components/merge/MergeCard";
import MergeChatbox from "../merge/MergeChatbox";

const cardData = [
  {
    title: "Birthday Video",
    description:
      "Craft a heartfelt birthday video using personal images, messages, and animated AI effects. Perfect for surprising your loved ones.",
  },
  {
    title: "Business Ad",
    description:
      "Promote your product or service with a compelling AI-powered video ad tailored to your brand, story, and audience.",
  },
  {
    title: "Social Content",
    description:
      "Create eye-catching short-form content for platforms like Instagram, TikTok, or YouTube using your images and custom AI animation.",
  },
];

export default function StorylineChat({ messages, handleSendMessage, handleCardClick, loading }) {
  useEffect(() => {
    console.log("messages:", messages);
  }, [messages]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
            <div className="flex flex-col items-center gap-10">
              <h1 className="text-4xl text-primary">What's Your Story?</h1>
              <div className="flex flex-wrap justify-center gap-6">
                {cardData.map((card, index) => (
                  <MergeCard
                    key={index}
                    title={card.title}
                    description={card.description}
                    size="300px"
                    clickable
                    onClick={() => handleCardClick(card.description)}
                  />
                ))}
              </div>
            </div>
            <MergeChatbar onSend={handleSendMessage} />
          </div>
        ) : (
          <>
            <motion.div
              key="chatbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 overflow-y-auto p-4"
            >
              <MergeChatbox messages={messages} isTyping={loading} />
            </motion.div>

            <motion.div
              key="chatbar-bottom"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="p-4"
            >
              <MergeChatbar onSend={handleSendMessage} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
