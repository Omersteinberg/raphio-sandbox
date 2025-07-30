import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  const internalRef = React.useRef(null);
  const combinedRef = ref || internalRef;

  const autoResize = () => {
    const el = combinedRef.current;
    if (!el) return;
    el.style.height = "auto";      
    el.style.height = el.scrollHeight + "px"; 
  };

  React.useEffect(() => {
    autoResize();
  }, []);

  const handleChange = (e) => {
    autoResize();
    if (props.onChange) props.onChange(e);
  };

  return (
    <textarea
      {...props}
      ref={combinedRef}
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent text-primary px-3 py-2 text-lg shadow-sm placeholder:text-primary focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        className
      )}
      onChange={handleChange}
      style={{ overflowY: "hidden" }} 
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
