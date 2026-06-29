import { useCallback, useEffect, useState } from "react";

export default function TimelinePlayhead({ position, pixelsPerSecond, height, onSeek }) {
  const x = position * pixelsPerSecond + 80; // 80px offset for track label
  const [isDragging, setIsDragging] = useState(false);

  const handleDown = useCallback((e) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMove = useCallback(
    (e) => {
      if (!isDragging || !onSeek) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX == null) return;
      if (e.cancelable) e.preventDefault(); // stop the timeline scrolling while scrubbing
      // Find the timeline container to calculate position relative to it
      const container = document.querySelector("[data-timeline-container]");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const x = clientX - rect.left + scrollLeft - 80; // subtract track label width
      const time = Math.max(0, x / pixelsPerSecond);
      onSeek(time);
    },
    [isDragging, onSeek, pixelsPerSecond]
  );

  const handleUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleUp);
      window.addEventListener("touchcancel", handleUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [isDragging, handleMove, handleUp]);

  return (
    <div
      className="absolute top-0 z-30 pointer-events-none"
      style={{
        left: x,
        height,
      }}
    >
      {/* Playhead line */}
      <div className="w-0.5 h-full bg-primary" />

      {/* Playhead handle — visible triangle with a larger invisible touch target */}
      <div
        className="absolute -top-1 -left-4 w-8 h-7 pointer-events-auto cursor-ew-resize flex justify-center touch-none"
        onMouseDown={handleDown}
        onTouchStart={handleDown}
      >
        <div
          className="w-4 h-4"
          style={{
            clipPath: "polygon(50% 100%, 0 0, 100% 0)",
            background: "hsl(var(--primary))",
          }}
        />
      </div>
    </div>
  );
}
