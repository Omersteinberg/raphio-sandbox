import { useCallback, useEffect, useState } from "react";

export default function TimelinePlayhead({ position, pixelsPerSecond, height, onSeek }) {
  const x = position * pixelsPerSecond + 80; // 80px offset for track label
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !onSeek) return;
      // Find the timeline container to calculate position relative to it
      const container = document.querySelector("[data-timeline-container]");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft - 80; // subtract track label width
      const time = Math.max(0, x / pixelsPerSecond);
      onSeek(time);
    },
    [isDragging, onSeek, pixelsPerSecond]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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

      {/* Playhead handle */}
      <div
        className="absolute -top-0 -left-2 w-4 h-4 pointer-events-auto cursor-ew-resize"
        style={{
          clipPath: "polygon(50% 100%, 0 0, 100% 0)",
          background: "hsl(var(--primary))",
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
