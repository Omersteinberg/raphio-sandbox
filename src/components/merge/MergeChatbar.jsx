import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export default function MergeChatbar({ onSend }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);

  const handleMessage = () => {
    if (message.trim() && onSend) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessage();
    }
  };

  useEffect(() => {
    if (textareaRef.current && typeof textareaRef.current.autoResize === "function") {
      textareaRef.current.autoResize();
    } else if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl px-2 py-2 shadow-sm">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        className="w-full !text-lg !shadow-none text-gray-900 bg-transparent border-none placeholder:text-gray-500 placeholder:text-lg focus:outline-none focus:ring-0 resize-none"
        placeholder="Tell me about your idea."
      />
      <div className="flex justify-end px-2 pb-2">
        <Button
          onClick={handleMessage}
          disabled={!message.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
        >
          <Send className='w-4 h-4'/>
        </Button>
      </div>
    </div>
  );
}
