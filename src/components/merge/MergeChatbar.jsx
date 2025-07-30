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
    <div className="flex flex-col w-full border-none bg-foreground rounded-xl px-2 py-2">
      <Textarea
      ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        className="w-full !text-lg !shadow-none text-primary bg-transparent border-none placeholder:text-primary placeholder:text-lg focus:outline-none focus:ring-0 resize-none"
        placeholder="Tell me about your idea."
      />
      <div className="flex justify-end px-2 pb-2">
        <Button 
          onClick={handleMessage}
          disabled={!message.trim()}
        >
          <Send className='text-primary'/>
        </Button>
      </div>
    </div>
  );
}