import { useEffect, useRef, useState } from "react";

const MergeChatbox = ({ messages, isTyping }) => {
  const scrollRef = useRef(null);
  const [animatedText, setAnimatedText] = useState("");
  const [lastMessageId, setLastMessageId] = useState(null);

  // Scroll to bottom on message or typing change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, animatedText]);

  useEffect(() => {
  const lastMsg = messages[messages.length - 1];
  if (
    !lastMsg ||
    lastMsg.sender !== "assistant" ||
    lastMsg.id === lastMessageId ||
    typeof lastMsg.text !== "string" ||
    lastMsg.text.trim() === ""
  ) {
    return;
  }

  setLastMessageId(lastMsg.id);

  const text = lastMsg.text;
  let i = 0;

  // Clear animated text first
  setAnimatedText("");

  const timeout = setTimeout(() => {
    const interval = setInterval(() => {
      if (i < text.length) {
        setAnimatedText(text.substring(0, i + 1)); // Use substring instead of concatenation
        i++;
      } else {
        clearInterval(interval);
      }
    }, 5);
  }, 10);

  return () => {
    clearTimeout(timeout);
  };
}, [messages]);

  return (
    <div
      ref={scrollRef}
      className="h-full bg-transparent rounded-xl w-full max-w-2xl overflow-y-auto scroll-smooth p-4 space-y-4"
    >
      {messages.map((message, index) => {
        const isLast =
          index === messages.length - 1 && message.sender === "assistant";
        return (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                message.sender === "user"
                  ? "bg-purple-600 text-white ml-auto"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {isLast ? animatedText : message.text}
              </p>
              <span className={`text-xs mt-1 block ${
                message.sender === "user"
                  ? "text-purple-200"
                  : "text-gray-500"
              }`}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        );
      })}

      {/* Typing indicator (if still generating) */}
      {isTyping && (
        <div className="flex justify-start">
          <div className="flex space-x-1 items-end px-4 py-3 bg-gray-100 rounded-2xl">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MergeChatbox;
