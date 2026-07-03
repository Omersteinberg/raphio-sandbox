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

  // Resize on mount AND whenever the controlled value changes, so programmatic
  // updates (AI "Improve", @mention insert) expand the box, not just keystrokes.
  React.useEffect(() => {
    autoResize();
  }, [props.value]);

  const handleChange = (e) => {
    autoResize();
    if (props.onChange) props.onChange(e);
  };

  return (
    <textarea
      {...props}
      ref={combinedRef}
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent text-foreground px-3 py-2 text-lg shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        className
      )}
      onChange={handleChange}
      // Merge caller style AFTER our default so props like paddingBottom apply
      // (the earlier bare `style` object silently dropped every caller style).
      style={{ overflowY: "hidden", ...props.style }}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
